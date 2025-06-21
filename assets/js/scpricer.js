// React + Tailwind Web App for Banlonant Emporium Pricer
// Assumes items.json is placed in `public` directory

import React, { useEffect, useState } from 'react';

export default function EmporiumPricer() {
  const [items, setItems] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [discount, setDiscount] = useState(0);
  const [delivery, setDelivery] = useState(false);
  const [splitPercent, setSplitPercent] = useState(0);

  useEffect(() => {
    fetch('/items.json')
      .then(res => res.json())
      .then(data => {
        setItems(data);
        const initialQuantities = {};
        data.forEach((item, index) => {
          initialQuantities[index] = 0;
        });
        setQuantities(initialQuantities);
      });
  }, []);

  const handleQuantityChange = (index, value) => {
    setQuantities(prev => ({ ...prev, [index]: parseInt(value) }));
  };

  const total = items.reduce((sum, item, index) => {
    const qty = quantities[index] || 0;
    return sum + item.sellPrice * qty;
  }, 0);

  const discounted = total - (total * (discount / 100));
  const finalTotal = delivery ? discounted + 100000 : discounted;
  const banroShare = finalTotal * (splitPercent / 100);
  const nantoShare = finalTotal - banroShare;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Banlonant Emporium Pricer</h1>
      <table className="w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Item</th>
            <th className="p-2 border">Sell Price</th>
            <th className="p-2 border">Size</th>
            <th className="p-2 border">Requested</th>
            <th className="p-2 border">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const qty = quantities[index] || 0;
            const totalPerItem = item.sellPrice * qty;
            return (
              <tr key={index} className="text-center">
                <td className="border p-1">{item.item}</td>
                <td className="border p-1">${item.sellPrice.toLocaleString()}</td>
                <td className="border p-1">{item.size}</td>
                <td className="border p-1">
                  <select
                    className="border p-1"
                    value={qty}
                    onChange={e => handleQuantityChange(index, e.target.value)}
                  >
                    {Array.from({ length: 11 }, (_, i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </td>
                <td className="border p-1">${totalPerItem.toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-6">
        <label className="block mb-2">Discount (%):</label>
        <input
          type="number"
          value={discount}
          onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
          className="border p-2 mb-4 w-full"
        />

        <label className="block mb-2">Include Delivery ($100,000)?</label>
        <input
          type="checkbox"
          checked={delivery}
          onChange={e => setDelivery(e.target.checked)}
          className="mb-4"
        />

        <label className="block mb-2">Divide Total by Percentage (Banro's %):</label>
        <input
          type="number"
          value={splitPercent}
          onChange={e => setSplitPercent(parseFloat(e.target.value) || 0)}
          className="border p-2 mb-4 w-full"
        />

        <div className="text-lg font-semibold">
          <p>Total Sale: ${total.toLocaleString()}</p>
          <p>Total w/ Discount + Delivery: ${finalTotal.toLocaleString()}</p>
          <p>Banro's Share: ${banroShare.toLocaleString()}</p>
          <p>Nanto's Share: ${nantoShare.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
