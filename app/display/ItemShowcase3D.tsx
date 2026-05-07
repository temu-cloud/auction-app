"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as THREE from "three";

interface ItemShowcase3DProps {
  itemName: string;
  itemImageUrl: string | null;
  startingPrice: number;
  isVisible: boolean; // parent controls visibility (false when bids > 0 or timer running)
}

/** Check WebGL availability once at module level (client-side only). */
function checkWebGLSupport(): boolean {
  if (typeof window === "undefined") return false;
  const canvas = document.createElement("canvas");
  return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
}

export default function ItemShowcase3D({
  itemName,
  itemImageUrl,
  startingPrice,
  isVisible,
}: ItemShowcase3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Lazily evaluate WebGL support on the client.
  const [webGLSupported] = useState<boolean>(() => checkWebGLSupport());

  const formattedPrice = startingPrice.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Three.js setup — only runs when WebGL is supported and the canvas is mounted.
  useEffect(() => {
    if (!webGLSupported || !canvasRef.current) return;

    const canvas = canvasRef.current;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    // Scene & camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    camera.position.z = 4;

    // Geometry
    const geometry = new THREE.PlaneGeometry(3, 2);

    // Material — use TextureLoader when an image URL is provided, otherwise solid color.
    let material: THREE.MeshBasicMaterial;
    if (itemImageUrl) {
      const texture = new THREE.TextureLoader().load(itemImageUrl);
      material = new THREE.MeshBasicMaterial({ map: texture });
    } else {
      material = new THREE.MeshBasicMaterial({ color: 0x333333 });
    }

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      mesh.rotation.y += 0.003;
      renderer.render(scene, camera);
    };
    animate();

    // Handle canvas resize
    const resizeObserver = new ResizeObserver(() => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(canvas);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [webGLSupported, itemImageUrl]);

  // Fallback for non-WebGL environments.
  if (!webGLSupported) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="fallback"
            className="relative w-full h-full flex flex-col items-center justify-end pb-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
          >
            {itemImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={itemImageUrl}
                alt={itemName}
                className="absolute inset-0 w-full h-full object-contain"
              />
            )}
            <div className="relative z-10 flex flex-col items-center pointer-events-none">
              <span className="text-4xl font-bold text-white drop-shadow-lg">{itemName}</span>
              <span className="text-2xl text-amber-400">{formattedPrice}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="showcase"
          className="relative w-full h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.5 }}
        >
          {/* Three.js canvas — behind text */}
          <canvas ref={canvasRef} className="absolute inset-0 z-0 w-full h-full" />

          {/* Text overlay — in front of canvas */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-16 pointer-events-none">
            <span className="text-4xl font-bold text-white drop-shadow-lg">{itemName}</span>
            <span className="text-2xl text-amber-400">{formattedPrice}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
