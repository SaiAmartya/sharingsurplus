"use client";

import { useState, useEffect, useRef } from "react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Enter address",
  className = "",
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue); // Update parent with text immediately

    if (newValue.length > 2) {
      try {
        console.log("Fetching predictions for:", newValue);
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(newValue)}`);
        
        if (!res.ok) {
          console.error("Autocomplete API error:", res.status, res.statusText);
          const errData = await res.json();
          console.error("Error details:", errData);
          return;
        }

        const data = await res.json();
        console.log("Predictions received:", data);
        
        if (data.predictions) {
          setPredictions(data.predictions);
          setShowPredictions(true);
        } else {
          console.warn("No predictions found in response:", data);
        }
      } catch (err) {
        console.error("Failed to fetch predictions", err);
      }
    } else {
      setPredictions([]);
      setShowPredictions(false);
    }
  };

  const handleSelect = async (placeId: string, description: string) => {
    setInputValue(description);
    setShowPredictions(false);

    try {
      const res = await fetch(`/api/places/details?place_id=${placeId}`);
      const data = await res.json();
      
      if (data.result) {
        const { lat, lng } = data.result.geometry.location;
        const formattedAddress = data.result.formatted_address;
        onChange(formattedAddress, lat, lng);
      }
    } catch (err) {
      console.error("Failed to fetch place details", err);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInput}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      
      {showPredictions && predictions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-lg max-h-60 overflow-auto">
          {predictions.map((prediction) => (
            <li
              key={prediction.place_id}
              onClick={() => handleSelect(prediction.place_id, prediction.description)}
              className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0"
            >
              <div className="font-bold">{prediction.structured_formatting.main_text}</div>
              <div className="text-xs text-slate-400">{prediction.structured_formatting.secondary_text}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
