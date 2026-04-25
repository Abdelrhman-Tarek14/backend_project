import { useState, useEffect } from 'react';
import { importantLinksApi } from '../api/importantLinksApi';
import type { ImportantLinkResources } from '../types';

export const useImportantLinks = () => {
  const [data, setData] = useState<ImportantLinkResources | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const response = await importantLinksApi.getLinks();
      setData(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  return { data, loading, error, refetch: fetchLinks };
};
