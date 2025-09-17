import { useState, useEffect } from 'react';

interface PanelSizes {
  left: number;
  center: number;
  right: number;
}

const DEFAULT_SIZES: PanelSizes = {
  left: 25,
  center: 50,
  right: 25
};

const STORAGE_KEY = 'project-panel-sizes';

export const usePanelPersistence = () => {
  const [panelSizes, setPanelSizes] = useState<PanelSizes>(DEFAULT_SIZES);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedSizes = JSON.parse(saved);
        // Validate the saved sizes
        if (parsedSizes.left && parsedSizes.center && parsedSizes.right) {
          setPanelSizes(parsedSizes);
        }
      }
    } catch (error) {
      console.warn('Failed to load panel sizes:', error);
    }
  }, []);

  const savePanelSizes = (sizes: PanelSizes) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
      setPanelSizes(sizes);
    } catch (error) {
      console.warn('Failed to save panel sizes:', error);
    }
  };

  return { panelSizes, savePanelSizes };
};