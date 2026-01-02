type ModalTab = {
  id: string;
  label: string;
};

type ModalTabsProps = {
  tabs: ModalTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
};

export function ModalTabs({ tabs, activeTab, onChange }: ModalTabsProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              isActive
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
