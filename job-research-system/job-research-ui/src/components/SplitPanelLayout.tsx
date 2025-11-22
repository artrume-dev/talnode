import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { GripVertical } from 'lucide-react';

interface SplitPanelLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftSize?: number; // Percentage (0-100)
  minLeftSize?: number; // Percentage
  minRightSize?: number; // Percentage
}

export function SplitPanelLayout({
  leftPanel,
  rightPanel,
  defaultLeftSize = 50,
  minLeftSize = 30,
  minRightSize = 30,
}: SplitPanelLayoutProps) {
  return (
    <div className="h-full w-full">
      {/* Desktop: Side-by-side panels */}
      <div className="hidden md:block h-full">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Jobs List */}
          <Panel
            defaultSize={defaultLeftSize}
            minSize={minLeftSize}
            className="h-full overflow-hidden"
          >
            <div className="h-full overflow-y-auto">
              {leftPanel}
            </div>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-primary transition-colors relative group">
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-gray-200 group-hover:bg-primary transition-colors" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-1 rounded bg-white border border-gray-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
          </PanelResizeHandle>

          {/* Right Panel - CV Preview/Editor */}
          <Panel
            defaultSize={100 - defaultLeftSize}
            minSize={minRightSize}
            className="h-full overflow-hidden"
          >
            <div className="h-full overflow-y-auto">
              {rightPanel}
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Mobile: Stacked panels */}
      <div className="md:hidden h-full overflow-y-auto space-y-4 p-4">
        <div className="min-h-[50vh]">
          {leftPanel}
        </div>
        <div className="min-h-[50vh]">
          {rightPanel}
        </div>
      </div>
    </div>
  );
}
