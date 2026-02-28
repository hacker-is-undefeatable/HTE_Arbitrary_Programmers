import { motion, AnimatePresence } from "framer-motion";
import { Checkpoint, CITY_SIZES } from "@/types/flight";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

interface BoardingPassProps {
  onProceed: () => void;
  checkpoints: Checkpoint[];
}

const BoardingPass = ({ onProceed, checkpoints }: BoardingPassProps) => {
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [isTearing, setIsTearing] = useState(false);

  const flightNo = useMemo(
    () => `DF-${Math.floor(Math.random() * 900 + 100)}`,
    [],
  );
  const gate = useMemo(
    () =>
      `${String.fromCharCode(65 + Math.floor(Math.random() * 6))}${Math.floor(Math.random() * 30 + 1)}`,
    [],
  );
  const boardingTime = useMemo(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }, []);
  const barcode = useMemo(
    () =>
      Array.from({ length: 40 }, () =>
        Math.random() > 0.3 ? (Math.random() > 0.5 ? 3 : 2) : 1,
      ),
    [],
  );

  const handleProceed = () => {
    setIsTearing(true);
    setTimeout(() => onProceed(), 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-xl mx-auto perspective-1000"
    >
      <div className="relative">
        {/* ═══ TOP HALF (stays) ═══ */}
        <motion.div
          animate={isTearing ? { y: -20, opacity: 0, scale: 0.95 } : {}}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeIn" }}
          className="bg-gradient-to-br from-[hsl(35,30%,95%)] to-[hsl(35,20%,90%)] rounded-t-2xl overflow-hidden shadow-2xl"
        >
          {/* Airline Header */}
          <div className="bg-gradient-to-r from-[hsl(222,35%,15%)] to-[hsl(222,30%,20%)] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[hsl(35,95%,55%)] flex items-center justify-center shadow-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 15l4-8 4 4 4-6 6 10"
                    stroke="hsl(222,35%,15%)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 17h20"
                    stroke="hsl(222,35%,15%)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-[hsl(35,95%,55%)] font-bold text-lg tracking-wide">
                  DEEPFOCUS
                </h2>
                <p className="text-[hsl(220,20%,70%)] text-[10px] tracking-[0.3em] font-mono">
                  AIRLINES
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[hsl(220,20%,70%)] text-[10px] tracking-wider">
                BOARDING PASS
              </p>
              <p className="text-white text-xs font-mono font-bold mt-0.5">
                {flightNo}
              </p>
            </div>
          </div>

          {/* Flight info row */}
          <div className="px-6 py-5 flex items-center gap-4 border-b border-[hsl(35,15%,80%)]/50">
            <div className="flex-1">
              <p className="text-[hsl(222,30%,30%)] text-[10px] tracking-wider font-medium">
                FROM
              </p>
              <p className="text-[hsl(222,35%,15%)] text-3xl font-bold tracking-wider mt-0.5">
                STR
              </p>
              <p className="text-[hsl(222,20%,50%)] text-xs mt-0.5">
                Study Start
              </p>
            </div>
            <div className="flex-1 flex flex-col items-center py-2">
              <div className="flex items-center w-full">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-[hsl(222,35%,15%)]" />
                <div className="flex-1 h-px bg-[hsl(222,20%,70%)] mx-1 relative">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(90deg, transparent, transparent 4px, hsl(35,15%,90%) 4px, hsl(35,15%,90%) 8px)",
                    }}
                  />
                </div>
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  className="text-[hsl(222,35%,15%)] -mx-1 z-10"
                >
                  <path
                    d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                    fill="currentColor"
                  />
                </svg>
                <div className="flex-1 h-px bg-[hsl(222,20%,70%)] mx-1 relative">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(90deg, transparent, transparent 4px, hsl(35,15%,90%) 4px, hsl(35,15%,90%) 8px)",
                    }}
                  />
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-[hsl(222,35%,15%)]" />
              </div>
              <p className="text-[hsl(222,20%,55%)] text-[9px] mt-1.5 font-mono">
                {checkpoints.length} STOPS
              </p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-[hsl(222,30%,30%)] text-[10px] tracking-wider font-medium">
                TO
              </p>
              <p className="text-[hsl(222,35%,15%)] text-3xl font-bold tracking-wider mt-0.5">
                FIN
              </p>
              <p className="text-[hsl(222,20%,50%)] text-xs mt-0.5">
                Study Complete
              </p>
            </div>
          </div>

          {/* Details grid */}
          <div className="px-6 py-4 grid grid-cols-4 gap-3 border-b border-[hsl(35,15%,80%)]/50">
            <div>
              <p className="text-[hsl(222,20%,55%)] text-[9px] tracking-wider">
                DATE
              </p>
              <p className="text-[hsl(222,35%,15%)] text-sm font-bold font-mono mt-0.5">
                {new Date()
                  .toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                  })
                  .toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-[hsl(222,20%,55%)] text-[9px] tracking-wider">
                BOARDING
              </p>
              <p className="text-[hsl(222,35%,15%)] text-sm font-bold font-mono mt-0.5">
                {boardingTime}
              </p>
            </div>
            <div>
              <p className="text-[hsl(222,20%,55%)] text-[9px] tracking-wider">
                GATE
              </p>
              <p className="text-[hsl(222,35%,15%)] text-sm font-bold font-mono mt-0.5">
                {gate}
              </p>
            </div>
            <div>
              <p className="text-[hsl(222,20%,55%)] text-[9px] tracking-wider">
                CLASS
              </p>
              <p className="text-[hsl(222,35%,15%)] text-sm font-bold font-mono mt-0.5">
                FOCUS
              </p>
            </div>
          </div>
        </motion.div>

        {/* ═══ PERFORATED TEAR LINE ═══ */}
        <motion.div
          className="relative py-1 bg-gradient-to-br from-[hsl(35,30%,95%)] to-[hsl(35,20%,90%)]"
          animate={isTearing ? { scaleY: 3, opacity: 0 } : {}}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-background z-10" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-background z-10" />
          <div className="border-t-2 border-dashed border-[hsl(35,15%,75%)] mx-8" />
          {isTearing && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-[hsl(35,20%,80%)] rounded-full"
                  initial={{ x: (i - 6) * 30, y: 0, opacity: 1 }}
                  animate={{ y: [0, -20, 40], opacity: 0, scale: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.02 }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* ═══ BOTTOM HALF (tears away) ═══ */}
        <motion.div
          animate={
            isTearing ? { y: 60, rotateZ: 2, opacity: 0, scale: 0.9 } : {}
          }
          transition={{ duration: 0.6, ease: [0.4, 0, 1, 1] }}
          className="bg-gradient-to-br from-[hsl(35,30%,95%)] to-[hsl(35,20%,90%)] rounded-b-2xl overflow-hidden shadow-2xl"
          style={{ transformOrigin: "top left" }}
        >
          {/* Flight Plan - Read-only display of AI-generated checkpoints */}
          <div className="px-6 py-4">
            <p className="text-[hsl(222,30%,30%)] text-[10px] tracking-[0.2em] font-semibold mb-3">
              ✈ FLIGHT PLAN — YOUR STUDY ROUTE
            </p>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {checkpoints.map((cp, i) => (
                <motion.div
                  key={cp.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div
                    className={`flex items-center justify-between rounded-lg px-3 py-2 border ${
                      cp.type === "chapter"
                        ? "bg-[hsl(35,95%,55%)]/10 border-[hsl(35,95%,55%)]/30"
                        : "bg-white/50 border-[hsl(35,15%,85%)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm">
                        {CITY_SIZES[cp.type].icon}
                      </span>
                      <span className="text-sm text-[hsl(222,35%,15%)] font-medium truncate">
                        {cp.name}
                      </span>
                      <span className="text-[10px] text-[hsl(222,15%,55%)] uppercase tracking-wider flex-shrink-0">
                        {CITY_SIZES[cp.type].label}
                      </span>
                    </div>
                    {cp.type === "chapter" &&
                      cp.children &&
                      cp.children.length > 0 && (
                        <button
                          onClick={() =>
                            setExpandedChapter(
                              expandedChapter === cp.id ? null : cp.id,
                            )
                          }
                          className="text-[hsl(222,15%,45%)] hover:text-[hsl(222,35%,15%)] transition-colors w-6 h-6 flex items-center justify-center"
                        >
                          <motion.div
                            animate={{
                              rotate: expandedChapter === cp.id ? 180 : 0,
                            }}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </motion.div>
                        </button>
                      )}
                  </div>

                  {/* Sub-checkpoints for chapters */}
                  <AnimatePresence>
                    {cp.type === "chapter" &&
                      expandedChapter === cp.id &&
                      cp.children && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-6 mt-1 space-y-1 border-l-2 border-[hsl(35,95%,55%)]/20 pl-3">
                            {cp.children.map((sub, j) => (
                              <motion.div
                                key={sub.id}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: j * 0.05 }}
                                className="flex items-center gap-1.5 bg-white/30 rounded px-2.5 py-1.5 border border-[hsl(35,15%,85%)]/50"
                              >
                                <span className="text-xs">
                                  {CITY_SIZES[sub.type].icon}
                                </span>
                                <span className="text-xs text-[hsl(222,35%,15%)]">
                                  {sub.name}
                                </span>
                                <span className="text-[9px] text-[hsl(222,15%,55%)] uppercase tracking-wider">
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
                <div className="text-center py-6 text-[hsl(222,15%,60%)] text-sm">
                  <p className="text-2xl mb-2">📄</p>
                  <p>Upload study material in the study tab</p>
                  <p className="text-xs mt-1">
                    Our AI will map your content to a flight plan
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Barcode */}
          <div className="px-6 pb-4">
            <div className="flex items-end gap-[1.5px] h-10 justify-center opacity-60">
              {barcode.map((w, i) => (
                <div
                  key={i}
                  className="bg-[hsl(222,35%,15%)]"
                  style={{
                    width: `${w}px`,
                    height: `${20 + Math.random() * 16}px`,
                  }}
                />
              ))}
            </div>
            <p className="text-center text-[9px] text-[hsl(222,15%,55%)] font-mono mt-1.5 tracking-[0.3em]">
              {flightNo} · DEEPFOCUS AIRLINES · BOARDING PASS
            </p>
          </div>

          {/* Proceed */}
          <div className="px-6 pb-6 pt-2">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleProceed}
              disabled={checkpoints.length === 0 || isTearing}
              className="w-full py-4 bg-[hsl(222,35%,15%)] text-[hsl(35,95%,55%)] rounded-xl font-bold text-sm hover:bg-[hsl(222,35%,20%)] transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-lg"
            >
              ✈ CHOOSE YOUR SEAT →
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default BoardingPass;
