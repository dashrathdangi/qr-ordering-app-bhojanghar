// components/SessionCard.js
import CloseSessionButton from "./CloseSessionButton";

export default function SessionCard({ session }) {
  const {
    id,
    customer_name,
    table_number,
    outlet,
    created_at,
    last_order_at,
    expires_at,
    status,
  } = session;

  return (
    <div className="border rounded-xl p-4 shadow-sm bg-white space-y-1">
      <h2 className="text-lg font-bold">🪑 Table: {table_number}</h2>
      <p>🧍 Name: {customer_name}</p>
      <p>🏬 Outlet: {outlet}</p>
      <p>⏱️ Started: {new Date(created_at).toLocaleString()}</p>
      <p>🕒 Last Order: {new Date(last_order_at).toLocaleString()}</p>
      <p>📅 Expires At: {new Date(expires_at).toLocaleString()}</p>
      <p>Status: <span className={`font-semibold ${status === 'expired' ? 'text-red-500' : 'text-green-600'}`}>{status}</span></p>
      {status !== "expired" && (
        <CloseSessionButton sessionId={id} />
      )}
    </div>
  );
}
