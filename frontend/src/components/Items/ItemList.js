import React, { useState, useEffect } from 'react';
import apiService from '../../services/api'; // Import API service
import ItemCard from './ItemCard';

// Nhận props là bộ lọc từ trang ShopPage/HomePage (nếu có)
function ItemList({ filters, searchQuery, limit }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      try {
        let params = {};
        if (filters) {
          params = { ...filters };
        } else if (searchQuery) {
          params = { search: searchQuery };
        }

        if (limit) {
          params.limit = limit;
        }

        // Gọi API getItems với query
        const response = await apiService.getItems(params);
        setItems(response.data);
      } catch (err) {
        setError('Failed to fetch items. Please try again later.');
        console.error(err);
      }
      setLoading(false);
    };

    fetchItems();
  }, [filters, searchQuery, limit]); // Chạy lại khi bộ lọc hoặc giới hạn thay đổi

  if (loading) {
    return <div className="text-center py-5">Loading items...</div>;
  }

  if (error) {
    return <div className="alert alert-danger" role="alert">{error}</div>;
  }

  if (items.length === 0) {
    return <div className="text-center py-5">No items found.</div>;
  }

  // Enforce client-side limit for robust display behavior
  const displayedItems = limit ? items.slice(0, limit) : items;

  return (
    <div className="row g-4">
      {displayedItems.map(item => (
        // Dùng ItemCard để render
        <ItemCard key={item._id} item={item} />
      ))}
    </div>
  );
}

export default ItemList;