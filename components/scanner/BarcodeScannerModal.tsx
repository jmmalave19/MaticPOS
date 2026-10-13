'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Flashlight, RefreshCw, X } from 'lucide-react';
import { useToast } from '../ui/ToastContext';
import { AudioService } from '../../services/audio.service';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  continuous?: boolean;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Lector de Código de Barras',
  continuous = false,
}: BarcodeScannerModalProps) {
  const { info } = useToast();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const readerElementId = 'barcode-scanner-viewport-card';

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
          // ignore clear errors
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
          // fallback to track constraints
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
        info('El flash de la cámara no está disponible en este dispositivo.');
      }
    } catch (err) {
      console.warn('Error alternando flash/linterna:', err);
      info('No se pudo activar el flash en este dispositivo.');
    }
  };

  const startScanner = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // Small delay to ensure modal DOM is mounted
    setTimeout(async () => {
      setCameraError(null);
      setIsFlashOn(false);
      hasScannedRef.current = false;
      isStoppingRef.current = false;
      const container = document.getElementById(readerElementId);
      if (!container) return;

      try {
        await stopScanner();
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
            const boxWidth = Math.floor(viewfinderWidth * 0.85);
            const boxHeight = Math.floor(viewfinderHeight * 0.7);
            return {
              width: Math.max(140, boxWidth),
              height: Math.max(80, boxHeight),
            };
          },
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (!decodedText || hasScannedRef.current) return;
            hasScannedRef.current = true;

            const cleanCode = decodedText.trim();
            if (!cleanCode) return;

            // Immediate retail barcode beep
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
    }, 180);
  }, [continuous, onClose, onScan, stopScanner]);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    }
    return () => {
      hasScannedRef.current = true;
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  const handleClose = () => {
    hasScannedRef.current = true;
    stopScanner().finally(() => {
      onClose();
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
          {/* Backdrop sutil */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
            onClick={handleClose}
          />

          {/* Tarjeta Simplificada del Lector */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-sm sm:max-w-md bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden z-10"
          >
            {/* Cabecera Limpia con Título, Botón de Flash y Cerrar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <h3 className="text-xs sm:text-sm font-semibold text-white truncate">
                  {title}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Botón de Flash / Linterna */}
                {!cameraError && (
                  <button
                    type="button"
                    onClick={toggleFlash}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isFlashOn
                        ? 'bg-amber-400 text-slate-950 font-semibold shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                    title={isFlashOn ? 'Apagar flash' : 'Activar flash'}
                  >
                    <Flashlight className={`w-3.5 h-3.5 ${isFlashOn ? 'text-slate-950' : 'text-slate-200'}`} />
                    <span>{isFlashOn ? 'Flash ON' : 'Flash'}</span>
                  </button>
                )}

                {/* Botón de Cierre */}
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Cerrar lector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenido / Viewport de Cámara */}
            <div className="relative w-full h-64 sm:h-72 bg-black overflow-hidden flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center text-white flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={startScanner}
                      className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reintentar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Viewport del video de la cámara */}
                  <div
                    id={readerElementId}
                    className="w-full h-full overflow-hidden [&>video]:w-full [&>video]:h-full [&>video]:object-cover [&>canvas]:hidden"
                  />

                  {/* Retícula Minimalista de Escaneo */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                    <div className="w-56 h-36 max-w-[85%] relative flex items-center justify-center">
                      {/* Esquinas guía */}
                      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl-md" />
                      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr-md" />
                      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl-md" />
                      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br-md" />
                      {/* Línea horizontal central */}
                      <div className="w-full h-0.5 bg-emerald-400/80 animate-pulse" />
                    </div>
                  </div>

                  {/* Indicador inferior */}
                  <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
                    <span className="text-[11px] text-slate-200 bg-slate-950/75 backdrop-blur-xs px-3 py-0.5 rounded-full font-medium">
                      Apunta al código de barras
                    </span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
