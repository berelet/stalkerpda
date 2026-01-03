export default function DashboardPage() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-[#91b3ca]">Zone Control Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Active Players */}
        <div className="bg-[#16202a] border border-[#233948] rounded-lg p-6 hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">group</span>
            <span className="text-xs text-[#91b3ca] uppercase tracking-wider">Live</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">0</h3>
          <p className="text-sm text-[#91b3ca]">Active Players</p>
        </div>

        {/* Artifacts */}
        <div className="bg-[#16202a] border border-[#233948] rounded-lg p-6 hover:border-[#eab308]/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-[#eab308] text-3xl">auto_awesome</span>
            <span className="text-xs text-[#91b3ca] uppercase tracking-wider">Total</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">0</h3>
          <p className="text-sm text-[#91b3ca]">Artifacts Spawned</p>
        </div>

        {/* Active Contracts */}
        <div className="bg-[#16202a] border border-[#233948] rounded-lg p-6 hover:border-[#22c55e]/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-[#22c55e] text-3xl">description</span>
            <span className="text-xs text-[#91b3ca] uppercase tracking-wider">Active</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">0</h3>
          <p className="text-sm text-[#91b3ca]">Active Contracts</p>
        </div>

        {/* Radiation Zones */}
        <div className="bg-[#16202a] border border-[#233948] rounded-lg p-6 hover:border-[#ef4444]/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-[#ef4444] text-3xl">warning</span>
            <span className="text-xs text-[#91b3ca] uppercase tracking-wider">Zones</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">0</h3>
          <p className="text-sm text-[#91b3ca]">Radiation Zones</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#16202a] border border-[#233948] rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button className="flex items-center gap-3 px-4 py-3 bg-[#233948] hover:bg-primary/20 hover:border-primary border border-transparent rounded-lg transition-colors group">
            <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">add_location</span>
            <span className="text-sm font-medium text-white">Spawn Artifact</span>
          </button>
          <button className="flex items-center gap-3 px-4 py-3 bg-[#233948] hover:bg-[#ef4444]/20 hover:border-[#ef4444] border border-transparent rounded-lg transition-colors group">
            <span className="material-symbols-outlined text-[#ef4444] group-hover:scale-110 transition-transform">add_circle</span>
            <span className="text-sm font-medium text-white">Create Zone</span>
          </button>
          <button className="flex items-center gap-3 px-4 py-3 bg-[#233948] hover:bg-[#22c55e]/20 hover:border-[#22c55e] border border-transparent rounded-lg transition-colors group">
            <span className="material-symbols-outlined text-[#22c55e] group-hover:scale-110 transition-transform">post_add</span>
            <span className="text-sm font-medium text-white">New Contract</span>
          </button>
          <button className="flex items-center gap-3 px-4 py-3 bg-[#233948] hover:bg-[#eab308]/20 hover:border-[#eab308] border border-transparent rounded-lg transition-colors group">
            <span className="material-symbols-outlined text-[#eab308] group-hover:scale-110 transition-transform">campaign</span>
            <span className="text-sm font-medium text-white">Broadcast</span>
          </button>
        </div>
      </div>
    </div>
  )
}
