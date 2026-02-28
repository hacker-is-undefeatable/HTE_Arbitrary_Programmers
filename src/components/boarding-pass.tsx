'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Checkpoint, CITY_SIZES } from '@/types/flight';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface BoardingPassProps {
  onProceed?: () => void;
  checkpoints: Checkpoint[];
  uploadSection?: React.ReactNode;
  actionLabel?: string;
  actionType?: 'button' | 'submit';
  actionDisabled?: boolean;
}

const BoardingPass = ({
  onProceed,
  checkpoints,
  uploadSection,
  actionLabel = '✈ CHOOSE YOUR SEAT →',
  actionType = 'button',
  actionDisabled,
}: BoardingPassProps) => {
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [isTearing, setIsTearing] = useState(false);
  const [flightNo, setFlightNo] = useState('DF-000');
  const [gate, setGate] = useState('A0');
  const [boardingTime, setBoardingTime] = useState('--:--');
  const [boardingDate, setBoardingDate] = useState('--- --');
  const [barcode, setBarcode] = useState<Array<{ width: number; height: number }>>(
    Array.from({ length: 40 }, () => ({ width: 1, height: 20 })),
  );

  useEffect(() => {
    const now = new Date();
    setFlightNo(`DF-${Math.floor(Math.random() * 900 + 100)}`);
    setGate(
      `${String.fromCharCode(65 + Math.floor(Math.random() * 6))}${Math.floor(
        Math.random() * 30 + 1,
      )}`,
    );
    setBoardingTime(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    );
    setBoardingDate(
      now
        .toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
        })
        .toUpperCase(),
    );
    setBarcode(
      Array.from({ length: 40 }, () => ({
        width: Math.random() > 0.3 ? (Math.random() > 0.5 ? 3 : 2) : 1,
        height: 20 + Math.random() * 16,
      })),
    );
  }, []);

  const handleProceed = () => {
    if (!onProceed) return;
    setIsTearing(true);
    setTimeout(() => onProceed(), 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto w-full max-w-xl [perspective:1000px]"
    >
      <div className="relative">
        <motion.div
          animate={isTearing ? { y: -20, opacity: 0, scale: 0.95 } : {}}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeIn' }}
          className="overflow-hidden rounded-t-2xl border bg-card shadow-2xl"
        >
          <div className="flex items-center justify-between bg-foreground px-6 py-4 text-background">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                ✈
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-wide text-primary">SCHOLORFLY</h2>
                <p className="text-[10px] tracking-[0.3em] text-muted">AIRLINES</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-wider text-muted">BOARDING PASS</p>
              <p className="mt-0.5 text-xs font-bold">{flightNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-b px-6 py-5">
            <div className="flex-1">
              <p className="text-[10px] font-medium tracking-wider text-muted-foreground">FROM</p>
              <p className="mt-0.5 text-3xl font-bold tracking-wider text-foreground">STR</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Study Start</p>
            </div>
            <div className="flex flex-1 flex-col items-center py-2">
              <div className="flex w-full items-center">
                <div className="h-2.5 w-2.5 rounded-full border-2 border-foreground" />
                <div className="mx-1 h-px flex-1 bg-border" />
                <div className="-mx-1 z-10 text-foreground">✈</div>
                <div className="mx-1 h-px flex-1 bg-border" />
                <div className="h-2.5 w-2.5 rounded-full bg-foreground" />
              </div>
              <p className="mt-1.5 text-[9px] text-muted-foreground">{checkpoints.length} STOPS</p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-[10px] font-medium tracking-wider text-muted-foreground">TO</p>
              <p className="mt-0.5 text-3xl font-bold tracking-wider text-foreground">FIN</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Study Complete</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 border-b px-6 py-4">
            <div>
              <p className="text-[9px] tracking-wider text-muted-foreground">DATE</p>
              <p className="mt-0.5 text-sm font-bold">{boardingDate}</p>
            </div>
            <div>
              <p className="text-[9px] tracking-wider text-muted-foreground">BOARDING</p>
              <p className="mt-0.5 text-sm font-bold">{boardingTime}</p>
            </div>
            <div>
              <p className="text-[9px] tracking-wider text-muted-foreground">GATE</p>
              <p className="mt-0.5 text-sm font-bold">{gate}</p>
            </div>
            <div>
              <p className="text-[9px] tracking-wider text-muted-foreground">CLASS</p>
              <p className="mt-0.5 text-sm font-bold">FOCUS</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="relative bg-card py-1"
          animate={isTearing ? { scaleY: 3, opacity: 0 } : {}}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute left-0 top-1/2 z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background" />
          <div className="absolute right-0 top-1/2 z-10 h-6 w-6 translate-x-1/2 -translate-y-1/2 rounded-full bg-background" />
          <div className="mx-8 border-t-2 border-dashed border-border" />
          {isTearing && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-1 w-1 rounded-full bg-muted-foreground"
                  initial={{ x: (i - 6) * 30, y: 0, opacity: 1 }}
                  animate={{ y: [0, -20, 40], opacity: 0, scale: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.02 }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>

        <motion.div
          animate={isTearing ? { y: 60, rotateZ: 2, opacity: 0, scale: 0.9 } : {}}
          transition={{ duration: 0.6, ease: [0.4, 0, 1, 1] }}
          className="overflow-hidden rounded-b-2xl border border-t-0 bg-card shadow-2xl"
          style={{ transformOrigin: 'top left' }}
        >
          {uploadSection ? (
            <div className="border-b px-6 py-4">
              <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
                CHECK-IN — UPLOAD MATERIALS
              </p>
              <div className="space-y-3">{uploadSection}</div>
            </div>
          ) : null}

          <div className="px-6 py-4">
            <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
              ✈ FLIGHT PLAN — YOUR STUDY ROUTE
            </p>

            <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
              {checkpoints.map((cp, i) => (
                <motion.div
                  key={cp.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                      cp.type === 'chapter'
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="text-sm">{CITY_SIZES[cp.type].icon}</span>
                      <span className="truncate text-sm font-medium text-foreground">{cp.name}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {CITY_SIZES[cp.type].label}
                      </span>
                    </div>
                    {cp.type === 'chapter' && cp.children && cp.children.length > 0 && (
                      <button
                        onClick={() => setExpandedChapter(expandedChapter === cp.id ? null : cp.id)}
                        className="flex h-6 w-6 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <motion.div animate={{ rotate: expandedChapter === cp.id ? 180 : 0 }}>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </motion.div>
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {cp.type === 'chapter' && expandedChapter === cp.id && cp.children && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-6 mt-1 space-y-1 border-l-2 border-primary/20 pl-3">
                          {cp.children.map((sub, j) => (
                            <motion.div
                              key={sub.id}
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: j * 0.05 }}
                              className="flex items-center gap-1.5 rounded border border-border bg-muted/20 px-2.5 py-1.5"
                            >
                              <span className="text-xs">{CITY_SIZES[sub.type].icon}</span>
                              <span className="text-xs text-foreground">{sub.name}</span>
                              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                                {CITY_SIZES[sub.type].label}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
              {checkpoints.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                </div>
              )}
            </div>
          </div>

          <div className="px-6 pb-4">
            <div className="flex h-10 items-end justify-center gap-[1.5px] opacity-60">
              {barcode.map((w, i) => (
                <div
                  key={i}
                  className="bg-foreground"
                  style={{
                    width: `${w.width}px`,
                    height: `${w.height}px`,
                  }}
                />
              ))}
            </div>
            <p className="mt-1.5 text-center text-[9px] tracking-[0.3em] text-muted-foreground">
              {flightNo} · SCHOLORFLY AIRLINES · BOARDING PASS
            </p>
          </div>

          <div className="px-6 pb-6 pt-2">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type={actionType}
              onClick={actionType === 'button' ? handleProceed : undefined}
              disabled={
                actionDisabled ?? (actionType === 'button' ? checkpoints.length === 0 || isTearing : false)
              }
              className="w-full rounded-xl bg-foreground py-4 text-sm font-bold text-background transition-all hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-20"
            >
              {actionLabel}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default BoardingPass;
