// src/components/books/BookCoverImage.tsx
'use client';

import NextImage, { type ImageProps as NextImageProps } from 'next/image';
import { useState, useEffect } from 'react';
import React from 'react';

// Props do componente
interface BookCoverImageOwnProps {
  srcProp: string | null | undefined;
  alt: string;
  fallbackSrc?: string; // Fallback final se tudo falhar
  priority?: boolean;
  quality?: number;
  fill?: boolean;
  style?: React.CSSProperties;
  className?: string;
  sizes?: string;
  width?: NextImageProps['width'];
  height?: NextImageProps['height'];
}

type RemainingImageProps = Omit<NextImageProps, 'src' | 'alt' | 'onError' | keyof BookCoverImageOwnProps>;
type BookCoverImageProps = BookCoverImageOwnProps & RemainingImageProps;


export function BookCoverImage({
  srcProp,
  alt,
  fallbackSrc = "/cover.jpg", // Usa o cover.jpg como fallback final por defeito
  priority,
  quality,
  fill,
  style,
  className,
  sizes,
  width,
  height,
  ...rest
}: BookCoverImageProps) {
  
  // Define o estado inicial corretamente
  const [currentImageSrc, setCurrentImageSrc] = useState(srcProp || fallbackSrc);

  useEffect(() => {
    // Atualiza o estado se a prop mudar
    setCurrentImageSrc(srcProp && srcProp.trim() !== '' ? srcProp : fallbackSrc);
  }, [srcProp, fallbackSrc]);

  const handleError = () => {
    // Se ocorrer um erro (ex: link quebrado), usa a imagem de fallback
    setCurrentImageSrc(fallbackSrc);
  };

  const imageProps = fill 
    ? { fill, style, sizes, className, priority, quality, ...rest }
    : { width, height, sizes, className, priority, quality, ...rest };


  return (
    <NextImage
      src={currentImageSrc}
      alt={alt}
      onError={handleError}
      {...imageProps}
    />
  );
}
