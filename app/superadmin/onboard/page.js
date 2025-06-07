"use client";

import { useState, useEffect } from "react";
import dayjs from "dayjs";


export default function SuperadminOnboard() {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    password: "",
    ownerId: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [outlets, setOutlets] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listMessage, setListMessage] = useState("");
  const [deletingSlug, setDeletingSlug] = useState("");
  const [subscriptions, setSubscriptions] = useState({});

useEffect(() => {
  fetchOutlets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  function generateSlug(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/--+/g, "-");
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const trimmedName = form.name.trim();
    const trimmedPassword = form.password.trim();
    const finalSlug = form.slug.trim() === "" ? generateSlug(trimmedName) : generateSlug(form.slug.trim());
    const ownerId = form.ownerId.trim();

    if (!trimmedName || !trimmedPassword || !ownerId) {
      setMessage("❌ Name, password, and owner ID are required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          slug: finalSlug,
          password: trimmedPassword,
          owner_id: ownerId,
        }),
      });

      const text = await res.text();

      if (res.ok) {
        setMessage("✅ Outlet created successfully!");
        setForm({ name: "", slug: "", password: "", ownerId: "" });
        fetchOutlets();
      } else {
        setMessage("❌ " + text);
      }
    } catch (err) {
      setMessage("❌ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOutlets() {
  setListLoading(true);
  setListMessage("");
  try {
    const res = await fetch("/api/outlets");
    const data = await res.json();
    setOutlets(data);

    // Fetch subscriptions for each outlet in parallel
    const subs = {};
    await Promise.all(
      data.map(async (outlet) => {
        try {
          const subRes = await fetch(`/api/subscriptions/${outlet.slug}`);
          if (subRes.ok) {
            const subData = await subRes.json();
            subs[outlet.slug] = subData;
          } else {
            subs[outlet.slug] = null;
          }
        } catch {
          subs[outlet.slug] = null;
        }
      })
    );
    setSubscriptions(subs);
    console.log("Subscriptions:", JSON.stringify(subscriptions, null, 2));
  } catch (err) {
    console.error("❌ fetchOutlets error:", err);
    setListMessage("❌ Failed to load outlets");
  } finally {
    setListLoading(false);
  }
}

async function toggleStatus(slug) {
  try {
    const res = await fetch(`/api/outlets/${slug}/status`, {
      method: "PATCH",
    });

    const text = await res.text();

    if (res.ok) {
      fetchOutlets(); // Refresh the list
      setListMessage("✅ Status updated");
    } else {
      setListMessage("❌ " + text);
    }
  } catch (err) {
    setListMessage("❌ Error: " + err.message);
  }
}

async function handleRenew(slug) {
  try {
    const res = await fetch(`/api/subscriptions/${slug}/renew`, {
      method: "POST",
    });
    if (res.ok) {
      alert("Renewal successful!");
      fetchOutlets(); // Refresh after renewal
    } else {
      const text = await res.text();
      alert("Renewal failed: " + text);
    }
  } catch (err) {
    alert("Renewal error: " + err.message);
  }
}

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 border rounded-lg shadow-lg bg-white">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
        🛠️ Superadmin: Add New Outlet
      </h1>

      {/* ADD OUTLET FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-semibold">Outlet Name *</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">Slug (optional)</label>
          <input
            type="text"
            name="slug"
            value={form.slug}
            onChange={handleChange}
            onBlur={() => setForm((prev) => ({ ...prev, slug: generateSlug(prev.slug) }))}
            placeholder="e.g. pizza-hut"
            className="w-full border px-3 py-2 rounded"
          />
          <small className="text-gray-500">Leave empty to auto-generate from name</small>
        </div>

        <div>
          <label className="block mb-1 font-semibold">Password *</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">Owner ID *</label>
          <input
            type="text"
            name="ownerId"
            value={form.ownerId}
            onChange={handleChange}
            placeholder="admin UUID or ID"
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Outlet"}
        </button>
      </form>

      {message && (
        <p
          className={`mt-4 text-center text-sm font-medium ${
            message.startsWith("✅") ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}

      {/* OUTLET LIST */}
      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4 text-center text-gray-800">📋 All Outlets</h2>

        {listLoading ? (
          <p className="text-center text-gray-600">Loading...</p>
        ) : outlets.length === 0 ? (
          <p className="text-center text-gray-500">No outlets found.</p>
        ) : (
          <ul className="space-y-4">
            {outlets.map((outlet) => (
  <li
    key={outlet.slug}
    className="border px-4 py-3 rounded"
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="font-semibold text-lg">{outlet.name}</p>
        <p className="text-sm text-gray-500">Slug: {outlet.slug}</p>
        <p className="text-sm text-gray-500">
          Created: {dayjs(outlet.created_at).format("DD MMM YYYY, h:mm A")}
        </p>
        <p className="text-sm text-gray-500">
          Updated: {dayjs(outlet.updated_at).format("DD MMM YYYY, h:mm A")}
        </p>
        <p className="text-sm text-gray-600">
          Status:{" "}
          <span className={outlet.status === "active" ? "text-green-600" : "text-red-600"}>
            {outlet.status}
          </span>
        </p>
      </div>
      <div className="flex flex-col gap-2 items-end">
        <button
          onClick={() => toggleStatus(outlet.slug)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          Toggle Status
        </button>
        <button
          onClick={() => deleteOutlet(outlet.slug)}
          className="text-red-600 hover:text-red-800 text-sm"
          disabled={deletingSlug === outlet.slug}
        >
          {deletingSlug === outlet.slug ? "Deleting..." : "🗑️ Delete"}
        </button>
      </div>
    </div>
   {/* ✅ Subscription Info UI inserted below the main row */}
  {subscriptions[outlet.slug] ? (
    <div className="mt-4 p-3 border rounded bg-gray-50 text-sm text-gray-700">
      <p>
        <strong>Plan:</strong> {subscriptions[outlet.slug].plan || "N/A"}
      </p>
      <p>
        <strong>Status:</strong>{" "}
        <span
          className={
            subscriptions[outlet.slug].status === "active"
              ? "text-green-600"
              : "text-red-600"
          }
        >
          {subscriptions[outlet.slug].status || "unknown"}
        </span>
      </p>
      <p>
        <strong>Renewal Date:</strong>{" "}
        {subscriptions[outlet.slug].renewal_date
          ? new Date(subscriptions[outlet.slug].renewal_date).toLocaleDateString()
          : "N/A"}
      </p>

      {(subscriptions[outlet.slug].status !== "active") && (
        <button
          onClick={() => handleRenew(outlet.slug)}
          className="mt-2 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Renew Subscription
        </button>
      )}
    </div>
  ) : (
    <p className="mt-2 text-sm text-gray-500">No subscription data</p>
  )}
</li>
))}
          </ul>
        )}

        {listMessage && (
          <p
            className={`mt-4 text-center text-sm font-medium ${
              listMessage.startsWith("✅") ? "text-green-600" : "text-red-600"
            }`}
          >
            {listMessage}
          </p>
        )}
      </div>
    </div>
  );
}
