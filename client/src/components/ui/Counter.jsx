import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

function Digit({ place, value, height }) {
  const isDecimal = place === '.';
  const valueRoundedToPlace = isDecimal ? 0 : Math.floor((value / place) % 10);
  const animatedValue = useSpring(valueRoundedToPlace, {
    mass: 0.15,
    stiffness: 120,
    damping: 18,
  });

  useEffect(() => {
    if (!isDecimal) {
      animatedValue.set(valueRoundedToPlace);
    }
  }, [animatedValue, valueRoundedToPlace, isDecimal]);

  const y = useTransform(animatedValue, (latest) => {
    return -latest * height;
  });

  if (isDecimal) {
    return (
      <span className="counter-digit" style={{ height, width: 'fit-content', display: 'inline-block' }}>
        .
      </span>
    );
  }

  return (
    <span 
      className="counter-digit" 
      style={{ 
        height, 
        width: '0.6em', 
        overflow: 'hidden', 
        display: 'inline-block', 
        position: 'relative' 
      }}
    >
      <motion.div style={{ y, display: 'flex', flexDirection: 'column' }}>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className="counter-number"
            style={{ 
              height, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              lineHeight: `${height}px`
            }}
          >
            {i}
          </span>
        ))}
      </motion.div>
    </span>
  );
}

export default function Counter({
  value,
  fontSize = 20,
  textColor = 'inherit',
  fontWeight = 'bold',
}) {
  const height = fontSize * 1.2;
  
  // Split number into digits
  const valueStr = Math.round(value).toString();
  const places = Array.from({ length: valueStr.length }, (_, i) => {
    return Math.pow(10, valueStr.length - 1 - i);
  });

  return (
    <span className="counter-container" style={{ fontSize, color: textColor, fontWeight }}>
      <span className="counter-counter" style={{ height }}>
        {places.map((place, idx) => (
          <Digit key={idx} place={place} value={value} height={height} />
        ))}
      </span>
    </span>
  );
}
