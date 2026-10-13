'use client';

import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share2, Check, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'settings' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'settings',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Si ya está instalada como PWA nativa, no mostrar el botón o mostrar badge informativo en settings
  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Aplicación instalada como PWA</span>
        </div>
      );
    }
    return null;
  }

  // Flujo Android / Chrome / Edge / Desktop
  if (isInstallable) {
    return (
      <>
        <button
          type="button"
          onClick={install}
          className={`flex items-center justify-center gap-2 font-semibold transition-all cursor-pointer ${
            variant === 'header'
              ? 'px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs shadow-xs'
              : 'px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs shadow-sm'
          } ${className}`}
          title="Instalar StockVenta en tu dispositivo"
        >
          <Download className="w-4 h-4 text-white shrink-0" />
          <span>Instalar App</span>
        </button>
      </>
    );
  }

  // Flujo iOS Safari
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center justify-center gap-2 font-semibold transition-all cursor-pointer ${
            variant === 'header'
              ? 'px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs border border-slate-200'
              : 'px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs border border-slate-200'
          } ${className}`}
          title="Cómo instalar en iPhone / iPad"
        >
          <Smartphone className="w-4 h-4 text-slate-700 shrink-0" />
          <span>Instalar en iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-slate-800" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Instalar en iPhone / iPad</h3>
                  <p className="text-xs text-slate-500">Agrega StockVenta a tu pantalla de inicio</p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-900">1.</span>
                  <span>Toca el botón <strong>Compartir</strong> <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-slate-700" /> en la barra de Safari.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-900">2.</span>
                  <span>Desliza hacia abajo y presiona <strong>&ldquo;Agregar al inicio&rdquo;</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-900">3.</span>
                  <span>Confirma tocando <strong>&ldquo;Agregar&rdquo;</strong> arriba a la derecha.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Si no está disponible el prompt pero estamos en Settings, dar opción informativa / botón
  if (variant === 'settings') {
    return (
      <button
        type="button"
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setShowIOSGuide(true);
          }
        }}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer ${className}`}
      >
        <Download className="w-4 h-4 text-white shrink-0" />
        <span>Instalar App en Dispositivo</span>
      </button>
    );
  }

  return null;
};
