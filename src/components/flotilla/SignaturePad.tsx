 "use client";

 import { useRef, useState, useEffect } from "react";
 import { Eraser, CheckCircle2 } from "lucide-react";

 interface SignaturePadProps {
   onSave: (base64Signature: string) => void;
   title?: string;
   subtitle?: string;
 }

 export default function SignaturePad({
   onSave,
   title = "Firma de Conformidad",
   subtitle = "Dibuja tu firma en el recuadro inferior",
 }: SignaturePadProps) {
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const [isDrawing, setIsDrawing] = useState(false);
   const [hasDrawn, setHasDrawn] = useState(false);

   // Ajustar el canvas al tamaño real de la pantalla para evitar distorsión táctil
   useEffect(() => {
     const canvas = canvasRef.current;
     if (canvas) {
       // Tomamos el tamaño del contenedor
       const rect = canvas.parentElement?.getBoundingClientRect();
       if (rect) {
         canvas.width = rect.width;
         canvas.height = 250; // Altura fija ideal para celulares

         // Fondo blanco inicial para que no sea transparente al exportar a Base64
         const ctx = canvas.getContext("2d");
         if (ctx) {
           ctx.fillStyle = "#FFFFFF";
           ctx.fillRect(0, 0, canvas.width, canvas.height);
         }
       }
     }
   }, []);

   const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
     const canvas = canvasRef.current;
     if (!canvas) return { x: 0, y: 0 };

     const rect = canvas.getBoundingClientRect();
     if ("touches" in event) {
       return {
         x: event.touches[0].clientX - rect.left,
         y: event.touches[0].clientY - rect.top,
       };
     }
     return {
       x: (event as React.MouseEvent).clientX - rect.left,
       y: (event as React.MouseEvent).clientY - rect.top,
     };
   };

   const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
     e.preventDefault();
     const { x, y } = getCoordinates(e);
     const ctx = canvasRef.current?.getContext("2d");
     if (ctx) {
       ctx.beginPath();
       ctx.moveTo(x, y);
       ctx.lineWidth = 3;
       ctx.lineCap = "round";
       ctx.lineJoin = "round";
       ctx.strokeStyle = "#000000"; // Tinta negra
       setIsDrawing(true);
     }
   };

   const draw = (e: React.MouseEvent | React.TouchEvent) => {
     e.preventDefault();
     if (!isDrawing) return;

     const { x, y } = getCoordinates(e);
     const ctx = canvasRef.current?.getContext("2d");
     if (ctx) {
       ctx.lineTo(x, y);
       ctx.stroke();
       setHasDrawn(true);
     }
   };

   const stopDrawing = () => {
     const ctx = canvasRef.current?.getContext("2d");
     if (ctx) {
       ctx.closePath();
       setIsDrawing(false);
     }
   };

   const handleClear = () => {
     const canvas = canvasRef.current;
     if (!canvas) return;

     const ctx = canvas.getContext("2d");
     if (ctx) {
       ctx.clearRect(0, 0, canvas.width, canvas.height);
       ctx.fillStyle = "#FFFFFF";
       ctx.fillRect(0, 0, canvas.width, canvas.height);
     }

     setHasDrawn(false);
   };

   const handleSave = () => {
     const canvas = canvasRef.current;
     if (!canvas) return;

     const dataUrl = canvas.toDataURL("image/png");
     onSave(dataUrl);
   };

   return (
     <div className="space-y-3">
       <div className="text-center space-y-1">
         <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
           {title}
         </p>
         <p className="text-[11px] text-neutral-400">{subtitle}</p>
       </div>

       <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm touch-none">
         <canvas
           ref={canvasRef}
           className="w-full h-[250px] touch-none"
           onMouseDown={startDrawing}
           onMouseMove={draw}
           onMouseUp={stopDrawing}
           onMouseLeave={stopDrawing}
           onTouchStart={startDrawing}
           onTouchMove={draw}
           onTouchEnd={stopDrawing}
         />
       </div>

       <div className="flex items-center justify-between gap-3">
         <button
           type="button"
           onClick={handleClear}
           className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-bold uppercase tracking-widest text-neutral-600 bg-white active:scale-95 transition"
         >
           <Eraser size={14} />
           Limpiar
         </button>
         <button
           type="button"
           onClick={handleSave}
           disabled={!hasDrawn}
           className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-emerald-600 disabled:bg-neutral-300 disabled:text-neutral-500 active:scale-95 transition"
         >
           <CheckCircle2 size={14} />
           Guardar
         </button>
       </div>
     </div>
  );
 }