// src/components/books/BookCoverImage.tsx
'use client';

import NextImage, { type ImageProps as NextImageProps } from 'next/image'; // Renomeado para NextImage e NextImageProps
import { useState, useEffect } from 'react';
import React from 'react'; // Import React para React.CSSProperties

// Definimos nossas props específicas, incluindo a 'src' flexível
interface BookCoverImageOwnProps {
  srcProp: string | null | undefined; // Renomeado para srcProp para evitar conflito com ImageProps['src']
  alt: string;
  fallbackSrc?: string;
  priority?: boolean;
  quality?: number;
  fill?: boolean;
  style?: React.CSSProperties;
  className?: string;
  sizes?: string;
  width?: NextImageProps['width']; // Usa o tipo de width de NextImageProps
  height?: NextImageProps['height']; // Usa o tipo de height de NextImageProps
}

// Usamos Omit para pegar as props restantes de NextImageProps, excluindo as que gerenciamos
type RemainingImageProps = Omit<NextImageProps, 'src' | 'alt' | 'onError' | keyof BookCoverImageOwnProps>;

// Props finais do nosso componente
type BookCoverImageProps = BookCoverImageOwnProps & RemainingImageProps;


export function BookCoverImage({
  srcProp, // Usamos srcProp aqui
  alt,
  fallbackSrc = "/placeholder-book.png",
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
  const [currentImageSrc, setCurrentImageSrc] = useState(srcProp || fallbackSrc);

  useEffect(() => {
    // Se srcProp for uma string vazia, também usamos o fallback
    setCurrentImageSrc(srcProp && srcProp.trim() !== '' ? srcProp : fallbackSrc);
  }, [srcProp, fallbackSrc]);

  const handleError = () => {
    setCurrentImageSrc(fallbackSrc);
  };

  // Se fill for true, width e height não devem ser passados para NextImage
  const imageProps = fill 
    ? { fill, style, sizes, className, priority, quality, ...rest }
    : { width, height, sizes, className, priority, quality, ...rest };


  return (
    <NextImage
      src={currentImageSrc} // currentImageSrc sempre será uma string (URL ou fallback)
      alt={alt}
      onError={handleError}
      {...imageProps} // Passa as props apropriadas
    />
  );
}