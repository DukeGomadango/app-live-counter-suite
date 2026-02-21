import ModeSelector from "@/components/ModeSelector";
import { Sparkles } from "lucide-react";

export default function GatchaPage() {
    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden relative z-10">
            {/* Header bar isolated for Gatcha */}
            <div
                className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2"
                style={{
                    background: "rgba(10,5,30,0.5)",
                    backdropFilter: "blur(12px)",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
            >
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10" /> {/* Spacer for hamburger menu area */}
                    <ModeSelector />
                </div>
            </div>

            <main className="flex-1 overflow-auto flex items-center justify-center p-4 pt-20">
                <div className="text-center">
                    <Sparkles className="w-24 h-24 mx-auto text-yellow-500/50 mb-6" />
                    <h1 className="text-2xl font-bold text-white/90 tracking-wider mb-2">Gatcha Mode</h1>
                    <p className="text-white/50 text-sm">Under Construction</p>
                </div>
            </main>
        </div>
    );
}
