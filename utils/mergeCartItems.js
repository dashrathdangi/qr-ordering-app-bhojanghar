// utils/mergeCartItems.js

export default function mergeCartItems(cart) {
  if (!Array.isArray(cart)) return [];

  const grouped = {};

  cart.forEach((item) => {
    if (!item || !item.name) return;

    const quantity = parseInt(item.quantity, 10) || 1;
    const price = parseFloat(item.price) || 0;
    const is_package = item.is_package || false;

    const key = `${item.name}-${is_package ? 'package' : 'dinein'}`;

    if (grouped[key]) {
      grouped[key].quantity += quantity;
    } else {
      grouped[key] = {
        ...item,
        quantity,
        price,
        is_package,
      };
    }
  });

  return Object.entries(grouped).map(([key, value]) => ({
    key,
    ...value,
  }));
}
