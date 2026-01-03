export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-admin-bg p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-admin-surface p-6 rounded-lg border border-admin-border">
          <h3 className="text-lg font-semibold mb-2">Active Players</h3>
          <p className="text-3xl font-bold text-admin-primary">0</p>
        </div>
        <div className="bg-admin-surface p-6 rounded-lg border border-admin-border">
          <h3 className="text-lg font-semibold mb-2">Artifacts</h3>
          <p className="text-3xl font-bold text-admin-success">0</p>
        </div>
        <div className="bg-admin-surface p-6 rounded-lg border border-admin-border">
          <h3 className="text-lg font-semibold mb-2">Active Contracts</h3>
          <p className="text-3xl font-bold text-admin-warning">0</p>
        </div>
        <div className="bg-admin-surface p-6 rounded-lg border border-admin-border">
          <h3 className="text-lg font-semibold mb-2">Zones</h3>
          <p className="text-3xl font-bold text-admin-danger">0</p>
        </div>
      </div>
    </div>
  )
}
