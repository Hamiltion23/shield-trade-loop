// Updated by Hamiltion23 at 2025-11-05 15:27
import { ShieldSwapPanel } from "@/components/ShieldSwapPanel";
import { OperationLogPanel } from "@/components/OperationLogPanel";

// Enhanced
// Enhanced
export default function Home() {
  return (
    <main>
      <section className="w-full px-3 md:px-0 mt-6">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Trade Without
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Exposure
              </span>
            </h1>
            <p className="text-base-content/70">
              Execute OTC swaps with encrypted trade sizes and parameters until settlement.
              Prevent frontrunning and MEV.
            </p>
            <OperationLogPanel />
          </div>
          <div className="flex justify-center md:justify-end">
            <ShieldSwapPanel />
          </div>
        </div>
      </section>
    </main>
  );
}

