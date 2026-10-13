'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { motion } from 'motion/react';
import { AlertCircle, Flashlight, RefreshCw, X } from 'lucide-react';
import { useToast } from '../ui/ToastContext';
import { AudioService } from '../../services/audio.service';

interface HeaderBarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  title?: string;
  continuous?: boolean;
}

export function HeaderBarcodeScanner({
  onScan,
  onClose,
  title = 'Lector de Código',
  continuous = false,
}: HeaderBarcodeScannerProps) {
  const { info } = useToast();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const readerElementId = 'header-barcode-scanner-viewport';

  const stopScanner = useCallback(async () => {
    setIsFlashOn(false);
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    // Direct hardware camera track shutdown
    try {
      const container = document.getElementById(readerElementId);
      const video = container?.querySelector('video') as HTMLVideoElement | null;
      const stream = video?.srcObject as MediaStream | null;
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
      }
    } catch {
      // ignore
    }

    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch {
        // ignore already stopped errors
      } finally {
        try {
          scanner.clear();
        } catch {
          // ignore clear errors during DOM unmount
        }
      }
    }
  }, []);

  const toggleFlash = async () => {
    const nextState = !isFlashOn;
    try {
      let applied = false;

      // 1. Try html5-qrcode's torchFeature API
      if (scannerRef.current) {
        try {
          const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
          const torchFeature = capabilities?.torchFeature();
          if (torchFeature && torchFeature.isSupported()) {
            await torchFeature.apply(nextState);
            applied = true;
          }
        } catch {
          // Fallback to track constraints
        }
      }

      // 2. Direct MediaStreamTrack constraint fallback
      if (!applied) {
        const container = document.getElementById(readerElementId);
        const video = container?.querySelector('video') as HTMLVideoElement | null;
        const stream = video?.srcObject as MediaStream | null;
        const track = stream?.getVideoTracks?.()[0];
        if (track) {
          await track.applyConstraints({
            advanced: [{ torch: nextState } as MediaTrackConstraintSet],
          });
          applied = true;
        }
      }

      if (applied) {
        setIsFlashOn(nextState);
      } else {
        info('El flash no está disponible en este dispositivo.');
      }
    } catch (err) {
      console.warn('Error alternando flash:', err);
      info('No se pudo activar el flash en este dispositivo.');
    }
  };

  const startScanner = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // Small delay to ensure the container is mounted in the DOM
    setTimeout(async () => {
      setCameraError(null);
      setIsFlashOn(false);
      hasScannedRef.current = false;
      isStoppingRef.current = false;
      const container = document.getElementById(readerElementId);
      if (!container) return;

      try {
        await stopScanner();
        // Reset flags for new scanner instance
        hasScannedRef.current = false;
        isStoppingRef.current = false;

        const html5QrCode = new Html5Qrcode(readerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.ITF,
          ],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        const config = {
          fps: 20,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const boxWidth = Math.floor(viewfinderWidth * 0.9);
            const boxHeight = Math.floor(viewfinderHeight * 0.85);
            return {
              width: Math.max(130, boxWidth),
              height: Math.max(60, boxHeight),
            };
          },
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (!decodedText || hasScannedRef.current) return;
            // Atomic lock: immediately prevent any subsequent frames from firing
            hasScannedRef.current = true;

            const cleanCode = decodedText.trim();
            if (!cleanCode) return;

            // Immediate classic retail barcode scanner beep!
            AudioService.playBarcodeBeep();

            // Immediately pause scanner engine
            try {
              if (html5QrCode.isScanning) {
                html5QrCode.pause(true);
              }
            } catch {
              // ignore
            }

            // Immediately shut off hardware video tracks
            try {
              const el = document.getElementById(readerElementId);
              const vid = el?.querySelector('video') as HTMLVideoElement | null;
              const st = vid?.srcObject as MediaStream | null;
              if (st) {
                st.getTracks().forEach((track) => {
                  try { track.stop(); } catch {}
                });
              }
            } catch {
              // ignore
            }

            // Emit scan result
            onScan(cleanCode);

            if (!continuous) {
              stopScanner().finally(() => {
                onClose();
              });
            }
          },
          () => {
            // Frame scanned with no barcode - continue
          }
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'No se pudo acceder a la cámara.';
        setCameraError(
          message.includes('Permission') || message.includes('denied')
            ? 'Permiso de cámara denegado.'
            : 'No se detectó cámara disponible.'
        );
      }
    }, 150);
  }, [continuous, onClose, onScan, stopScanner]);

  useEffect(() => {
    startScanner();

    return () => {
      hasScannedRef.current = true;
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  const handleClose = () => {
    hasScannedRef.current = true;
    stopScanner().finally(() => {
      onClose();
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, height: 0 }}
      animate={{ opacity: 1, y: 0, height: '15vh' }}
      exit={{ opacity: 0, y: -6, height: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full h-[15vh] min-h-[110px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-700/60 shadow-md relative select-none"
    >
      {cameraError ? (
        <div className="w-full h-full p-3 bg-slate-900 flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-2 text-amber-400 text-xs min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{cameraError}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={startScanner}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white flex items-center gap-1 cursor-pointer transition-colors"
              title="Reintentar cámara"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Reintentar</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Cerrar lector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full bg-slate-950 overflow-hidden">
          {/* Viewport de video */}
          <div
            id={readerElementId}
            className="w-full h-full overflow-hidden [&>video]:w-full [&>video]:h-full [&>video]:object-cover [&>canvas]:hidden"
          />

          {/* Retícula sutil no sobrecargada */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-4/5 max-w-xs h-3/5 relative flex items-center justify-center">
              {/* Esquinas guía minimalistas */}
              <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400 rounded-tl-xs" />
              <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400 rounded-tr-xs" />
              <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400 rounded-bl-xs" />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400 rounded-br-xs" />
              {/* Línea horizontal central muy sutil */}
              <div className="w-full h-[1.5px] bg-emerald-400/70" />
            </div>
          </div>

          {/* Controles superiores sobre la cámara */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto">
            {/* Indicador de título / estado */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs border border-slate-700/60 text-[10px] font-medium text-white/90">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span className="truncate max-w-[130px] sm:max-w-none">{title}</span>
            </div>

            {/* Acciones: Flash y Cerrar */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleFlash}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border backdrop-blur-xs transition-colors cursor-pointer ${
                  isFlashOn
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-semibold'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60'
                }`}
                title={isFlashOn ? 'Apagar flash' : 'Activar flash'}
              >
                <Flashlight className={`w-3 h-3 ${isFlashOn ? 'text-slate-950' : 'text-slate-300'}`} />
                <span>{isFlashOn ? 'Flash ON' : 'Flash'}</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 backdrop-blur-xs transition-colors cursor-pointer"
                title="Cerrar lector"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Subtítulo inferior sutil */}
          <div className="absolute bottom-1 inset-x-0 text-center pointer-events-none">
            <span className="text-[9px] text-white/70 bg-slate-950/60 backdrop-blur-2xs px-2 py-0.5 rounded-full font-medium">
              Apunta al código de barras
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
