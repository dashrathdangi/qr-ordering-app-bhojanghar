import { useState } from 'react';

export default function DishForm({ initialData = {}, onSave }) {
  const [name, setName] = useState(initialData.name || '');
  const [price, setPrice] = useState(initialData.price || '');
  const [image_url, setImageUrl] = useState(initialData.image_url || '');
  const [isEditing, setIsEditing] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!name || !price) return;
    onSave({
      ...initialData,
      name,
      price,
      image_url,
    });
    setIsEditing(false);
  }

  if (!isEditing && !initialData.id) {
    return (
      <button onClick={() => setIsEditing(true)} className="mt-2 text-blue-500">
        ➕ Add Dish
      </button>
    );
  }

  if (!isEditing) {
    return (
      <button onClick={() => setIsEditing(true)} className="text-blue-500">
        Edit
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-2">
      <input
        className="border p-1"
        placeholder="Dish Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="border p-1"
        placeholder="Price"
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <input
        className="border p-1"
        placeholder="Image URL"
        value={image_url}
        onChange={(e) => setImageUrl(e.target.value)}
      />
      <div className="flex gap-2">
        <button type="submit" className="text-green-600">
          Save
        </button>
        <button type="button" onClick={() => setIsEditing(false)} className="text-gray-500">
          Cancel
        </button>
      </div>
    </form>
  );
}
