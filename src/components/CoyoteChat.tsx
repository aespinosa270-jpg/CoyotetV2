'use client';
import { useState, useRef, useEffect } from 'react';

// ============================================================
// BASE DE CONOCIMIENTO COMPLETA DE PRODUCTOS
// ============================================================
const PRODUCTOS = [
  // --- TELAS ---
  { id:"prod_alaska", nombre:"Alaska", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:175, precio_mayoreo:170, unidad:"Kilo", descripcion:"Tela deportiva especializada para sublimación de alta definición. Color único blanco.", origen:"Importado" },
  { id:"prod_andromeda", nombre:"Andromeda", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:155, precio_mayoreo:150, unidad:"Kilo", descripcion:"Tela deportiva para sublimación de alta definición.", origen:"Importado" },
  { id:"prod_apolo", nombre:"Apolo", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"150g/m²", ancho:"1.60m", rendimiento:"3.7 m/kg", precio_menudeo:160, precio_mayoreo:155, unidad:"Kilo", descripcion:"Resistencia superior a la abrasión y el pilling.", origen:"Importado" },
  { id:"prod_ares", nombre:"Ares", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:135, precio_mayoreo:130, unidad:"Kilo", descripcion:"Tela deportiva para sublimación de alta definición.", origen:"Importado" },
  { id:"prod_athlos", nombre:"Athlos", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"145g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:125, precio_mayoreo:120, unidad:"Kilo", descripcion:"Versatilidad total para cualquier disciplina deportiva.", origen:"Importado" },
  { id:"prod_azucena", nombre:"Azucena", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:95, precio_mayoreo:90, unidad:"Kilo", descripcion:"Tela deportiva económica para sublimación.", origen:"Importado" },
  { id:"prod_brock", nombre:"Brock", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"145g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:155, precio_mayoreo:150, unidad:"Kilo", descripcion:"Versatilidad total para cualquier disciplina deportiva.", origen:"Importado" },
  { id:"prod_brush", nombre:"Brush", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:120, precio_mayoreo:115, unidad:"Kilo", descripcion:"Tela deportiva para sublimación.", origen:"Importado" },
  { id:"prod_capriati", nombre:"Capriati", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:135, precio_mayoreo:130, unidad:"Kilo", descripcion:"Tela deportiva para sublimación.", origen:"Importado" },
  { id:"prod_caprice", nombre:"Caprice", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:140, precio_mayoreo:135, unidad:"Kilo", descripcion:"Tela deportiva para sublimación.", origen:"Importado" },
  { id:"prod_delta", nombre:"Delta", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:175, precio_mayoreo:170, unidad:"Kilo", descripcion:"Tela deportiva premium para sublimación.", origen:"Importado" },
  { id:"prod_diablo", nombre:"Diablo", categoria:"Telas Técnicas", composicion:"100% Nylon Alta Tenacidad", gramaje:"220g/m²", ancho:"1.50m", rendimiento:"1 m/metro", precio_menudeo:88, precio_mayoreo:83, unidad:"Metro", descripcion:"Uso rudo absoluto. Resistente a la abrasión, ideal para equipo táctico y calzado.", origen:"Importado", rollo_metros:50, colores:["Perla","Marino","Vino","Blanco","Azul Rey","Rojo","Negro","Oxford"] },
  { id:"prod_f30", nombre:"F30", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:135, precio_mayoreo:130, unidad:"Kilo", descripcion:"Tela deportiva para sublimación.", origen:"Importado" },
  { id:"prod_felpa_china", nombre:"Felpa China", categoria:"Línea Invernal", composicion:"50% Algodón / 50% Poliéster", gramaje:"280g/m²", ancho:"1.60m", rendimiento:"2.2 m/kg", precio_menudeo:110, precio_mayoreo:105, unidad:"Kilo", descripcion:"Ideal para sudaderas, pants y ropa deportiva de invierno. Cara lisa y reverso afelpado.", origen:"Importado", rollo_kg:25, colores:["Marino","Negro","Blanco","Azul Rey","Vino","Rojo","Jaspe Perla","Oxford Jaspe"] },
  { id:"prod_felpa_spun", nombre:"Felpa Spun", categoria:"Línea Invernal", composicion:"100% Poliéster", gramaje:"280g/m²", ancho:"1.90m", rendimiento:"2.5 m/kg", precio_menudeo:110, precio_mayoreo:105, unidad:"Kg", descripcion:"Tejido de alto volumen y suavidad excepcional para sudaderas premium.", origen:"Importado", rollo_kg:25, colores:["Blanco","Rojo","Marino","Negro","Azul Rey","Vino"] },
  { id:"prod_flanel", nombre:"Flanel", categoria:"Línea Invernal", composicion:"100% Poliéster", gramaje:"260g/m²", ancho:"1.60m", rendimiento:"2.4 m/kg", precio_menudeo:125, precio_mayoreo:120, unidad:"Kilo", descripcion:"Ultra suave, afelpado y ligero. Ideal para pijamas, cobijas, sudaderas.", origen:"Importado", rollo_kg:27, colores:["Blanco","Vino","Marino","Negro","Fiusha","Palo Rosa","Rosa Pastel","Azul Rey","Naranja","Rojo"] },
  { id:"prod_granizo", nombre:"Granizo", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:115, precio_mayoreo:110, unidad:"Kilo", descripcion:"Tela deportiva para sublimación.", origen:"Importado" },
  { id:"prod_horous", nombre:"Horous", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"145g/m²", ancho:"1.60m", rendimiento:"4.2 m/kg", precio_menudeo:160, precio_mayoreo:155, unidad:"Kilo", descripcion:"Diseño vanguardista para moda deportiva urbana.", origen:"Importado" },
  { id:"prod_inter_70", nombre:"Inter 70", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:140, precio_mayoreo:135, unidad:"Kilo", descripcion:"Tela deportiva para sublimación.", origen:"Importado" },
  { id:"prod_jumanji", nombre:"Jumanji", categoria:"Deportivo / Licra", composicion:"Poliéster / Spandex", gramaje:"180g/m²", ancho:"1.60m", rendimiento:"3.5 m/kg", precio_menudeo:145, precio_mayoreo:140, unidad:"Kilo", descripcion:"Alta elasticidad y recuperación para prendas ajustadas.", origen:"Importado" },
  { id:"prod_kyoto", nombre:"Kyoto", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"145g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:155, precio_mayoreo:150, unidad:"Kilo", descripcion:"Acabado premium con tacto seda y caída espectacular.", origen:"Importado" },
  { id:"prod_licra_liluna", nombre:"Licra Liluna", categoria:"Deportivo / Licra", composicion:"Poliéster / Spandex", gramaje:"180g/m²", ancho:"1.60m", rendimiento:"3.5 m/kg", precio_menudeo:135, precio_mayoreo:130, unidad:"Kilo", descripcion:"Alta elasticidad para prendas ajustadas.", origen:"Importado" },
  { id:"prod_licra_playera", nombre:"Licra Playera", categoria:"Deportivo / Licra", composicion:"Poliéster / Spandex", gramaje:"180g/m²", ancho:"1.60m", rendimiento:"3.5 m/kg", precio_menudeo:130, precio_mayoreo:125, unidad:"Kilo", descripcion:"Alta elasticidad para prendas ajustadas.", origen:"Importado" },
  { id:"prod_licra_poliester", nombre:"Licra Poliéster", categoria:"Deportivo / Licra", composicion:"Poliéster / Spandex", gramaje:"180g/m²", ancho:"1.60m", rendimiento:"3.5 m/kg", precio_menudeo:145, precio_mayoreo:140, unidad:"Kilo", descripcion:"Alta elasticidad.", origen:"Importado", colores:["Blanco","Negro","Rojo","Rey","Marino"] },
  { id:"prod_licra_saludable", nombre:"Licra Saludable", categoria:"Deportivo / Licra", composicion:"Poliéster / Spandex", gramaje:"180g/m²", ancho:"1.60m", rendimiento:"3.5 m/kg", precio_menudeo:140, precio_mayoreo:135, unidad:"Kilo", descripcion:"Alta elasticidad.", origen:"Importado", colores:["Blanco","Negro","Rojo","Rey","Marino","Militar","Perla Jaspe","Oxford Jaspe"] },
  { id:"lycra_metalica", nombre:"Lycra Metálica", categoria:"Deportivo / Licra", composicion:"100% Poliéster", gramaje:"145g/m²", ancho:"1.60m", rendimiento:"1 m/metro", precio_menudeo:50, precio_mayoreo:45, unidad:"Metro", descripcion:"Licra metálica brillante para prendas deportivas, escénicas, disfraces.", origen:"Importado", rollo_metros:98, colores:["Oro Metálico","Plata Metálica","Naranja Metálico","Rojo Metálico","Azul Rey Metálico","Turquesa Metálico","Perla Metálico","Verde Bandera Metálico","Verde Manzana Metálico","Rosa Pastel Metálico","Fiucha Metálico","Blanco Metálico","Negro Metálico"] },
  { id:"prod_madelino", nombre:"Madelino", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:155, precio_mayoreo:150, unidad:"Kilo", descripcion:"Tela deportiva para sublimación.", origen:"Importado" },
  { id:"prod_mercury", nombre:"Mercury", categoria:"Deportivo / Licra", composicion:"Poliéster / Spandex", gramaje:"180g/m²", ancho:"1.60m", rendimiento:"3.5 m/kg", precio_menudeo:160, precio_mayoreo:155, unidad:"Kilo", descripcion:"Alta elasticidad para prendas ajustadas y de alto impacto.", origen:"Importado" },
  { id:"prod_micro_estrella", nombre:"Micro Estrella", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:145, precio_mayoreo:140, unidad:"Kilo", descripcion:"Tela deportiva para sublimación.", origen:"Importado" },
  { id:"prod_micro_panal", nombre:"Micro Panal", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"145g/m²", ancho:"1.60m", rendimiento:"4.3 m/kg", precio_menudeo:110, precio_mayoreo:105, unidad:"Kilo", descripcion:"Estructura de panal para máxima transpiración.", origen:"Importado", colores:["Blanco","Camel","Mostaza","Oro Viejo","Verde Neón","Amarillo Neón","Turquesa","Aqua","Militar","Botella","Bandera","Menta","Cielo","Vino","Lila","Naranja","Gris Baby","Uva","Petróleo","Palo de Rosa","Rosa Baby","Magenta","Rosa Pastel","Fiusha","Rosa Neón","Light Blue","Azul Rey","Navy Blue","Oxford","Medio","Perla","Mango","Canario","Caqui","Negro","Rojo","Rey","Azul Francia"] },
  { id:"prod_micropique", nombre:"Micro Piqué", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"145g/m²", ancho:"1.60m", rendimiento:"4.3 m/kg", precio_menudeo:100, precio_mayoreo:95, unidad:"Kilo", descripcion:"Tecnología Dry-Fit Calidad Gold. Ideal para uniformes deportivos.", origen:"Importado", colores:["Light Navy","Blanco","Gris Perla","Navy Dark Blue","Menta","Fiusha","Caqui","Uva M","Azul Acero","Vino","Beige","Camel","Gris Medio","Oxford","Militar","Rosa Baby","Amarillo Canario","Petróleo","Rosa Palo","Cielo","Mango","Turquesa","Azul Francia","Uva","Bugambilia","Oro Viejo","Mostaza","Azul Rey","Navy Blue","Naranja Neón","Naranja","Rosa Neón","Amarillo","Verde Neón","Negro","Verde Bandera","Verde Botella","Rojo"] },
  { id:"prod_micropique_fusionado", nombre:"Micropiqué Fusionado", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:150, precio_mayoreo:145, unidad:"Kilo", descripcion:"Tela deportiva fusionada para sublimación.", origen:"Importado" },
  { id:"prod_microtrix", nombre:"Microtrix", categoria:"Deportivo / Licra", composicion:"Poliéster / Spandex", gramaje:"180g/m²", ancho:"1.60m", rendimiento:"3.5 m/kg", precio_menudeo:150, precio_mayoreo:145, unidad:"Kilo", descripcion:"Alta elasticidad para prendas ajustadas.", origen:"Importado" },
  { id:"prod_miky", nombre:"Miky", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:135, precio_mayoreo:130, unidad:"Kilo", descripcion:"Tela deportiva para sublimación.", origen:"Importado" },
  { id:"prod_monaco", nombre:"Monaco", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:155, precio_mayoreo:150, unidad:"Kilo", descripcion:"Tela deportiva para sublimación.", origen:"Importado" },
  { id:"prod_nagasaky", nombre:"Nagasaky", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:135, precio_mayoreo:130, unidad:"Kilo", descripcion:"Tela deportiva para sublimación.", origen:"Importado" },
  { id:"prod_panal_nitro", nombre:"Panal Nitro", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"145g/m²", ancho:"1.60m", rendimiento:"4.2 m/kg", precio_menudeo:185, precio_mayoreo:180, unidad:"Kilo", descripcion:"Tejido técnico avanzado para control de humedad extremo.", origen:"Importado" },
  { id:"prod_panal_plus", nombre:"Panal Plus", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"145g/m²", ancho:"1.60m", rendimiento:"3.7 m/kg", precio_menudeo:155, precio_mayoreo:150, unidad:"Kilo", descripcion:"Mayor cuerpo y estructura para prendas que requieren forma.", origen:"Importado" },
  { id:"prod_phoenix", nombre:"Phoenix", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:95, precio_mayoreo:90, unidad:"Kilo", descripcion:"Tela deportiva económica para sublimación.", origen:"Importado" },
  { id:"prod_pique_lacoste", nombre:"Piqué Lacoste", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:140, precio_mayoreo:135, unidad:"Kilo", descripcion:"Tela deportiva para sublimación.", origen:"Importado" },
  { id:"prod_pique_vera", nombre:"Piqué Vera", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"145g/m²", ancho:"1.60m", rendimiento:"4.3 m/kg", precio_menudeo:110, precio_mayoreo:105, unidad:"Kilo", descripcion:"Tecnología Dry-Fit con textura suave y resistente.", origen:"Importado", colores:["Camel","Oro Viejo","Mostaza","Verde Neón","Amarillo Neón","Turquesa","Aqua","Rosa Neón","Magenta","Militar","Botella","Verde Bandera","Cielo","Menta","Vino","Lila","Naranja","Uva","Petróleo","Rosa Pastel","Rosa Baby","Palo Rosa","Fiusha","Light Navy","Dark Navy","Gris Medio","Oxford","Gris Perla","Mango","Canario","Caqui","Negro","Rojo","Rey"] },
  { id:"prod_pique_vera_sport", nombre:"Piqué Vera Sport", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"145g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:140, precio_mayoreo:135, unidad:"Kilo", descripcion:"Versatilidad total para cualquier disciplina deportiva.", origen:"Importado" },
  { id:"prod_pixel", nombre:"Pixel", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:155, precio_mayoreo:150, unidad:"Kilo", descripcion:"Tela deportiva para sublimación.", origen:"Importado" },
  { id:"prod_polar", nombre:"Polar", categoria:"Línea Invernal", composicion:"100% Poliéster", gramaje:"280g/m²", ancho:"1.60m", rendimiento:"2.5 m/kg", precio_menudeo:120, precio_mayoreo:115, unidad:"Kilo", descripcion:"Tela térmica con tecnología anti-pilling. Ideal para pijamas, mamelucos, cobijas.", origen:"Importado", rollo_kg:25, colores:["Verde Botella","Verde Militar","Palo Rosa","Azul Rey","Vino","Marino","Fiusha","Negro","Rojo","Blanco"] },
  { id:"prod_saturno", nombre:"Saturno", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:165, precio_mayoreo:160, unidad:"Kilo", descripcion:"Tela deportiva premium para sublimación.", origen:"Importado" },
  { id:"prod_super_trix", nombre:"Super Trix", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"140g/m²", ancho:"1.60m", rendimiento:"4.0 m/kg", precio_menudeo:175, precio_mayoreo:170, unidad:"Kilo", descripcion:"Tela deportiva premium para sublimación.", origen:"Importado" },
  { id:"prod_sportok", nombre:"Sportok", categoria:"Escolar / Deportivo", composicion:"100% Poliéster (Interior Afelpado)", gramaje:"260g/m²", ancho:"1.60m", rendimiento:"2.4 m/kg", precio_menudeo:80, precio_mayoreo:75, unidad:"Kg", descripcion:"Estándar para pants, sudaderas y uniformes escolares. Semi-brillante, interior afelpado.", origen:"Importado", rollo_kg:25, colores:["Francia","Marino Claro","Magenta","Chedron","Acero","Naranja Pastel","Amarillo Pastel","Petróleo","Oro Viejo","Mostaza","Palo de Rosa","Jade","Lila","Bugambilia","Fiusha","Gris Baby","Perla","Medio","Oxford","Caqui","Beige","Cafe","Camel","Rosa Pastel","Turquesa","Aqua","Menta","Morado","Uva","Rosa Baby","Cielo","Naranja Neón","Rosa Neón","Verde Neón","Amarillo Neón","Pistache","Manzana","Militar","Botella","Bandera","Naranja","Rey","Mango","Canario","Rojo","Rojo Quemado","Negro","Blanco","Marino"] },
  { id:"prod_torneo", nombre:"Torneo", categoria:"Deportivas / Sublimación", composicion:"100% Poliéster", gramaje:"150g/m²", ancho:"1.60m", rendimiento:"4.3 m/kg", precio_menudeo:125, precio_mayoreo:120, unidad:"Kilo", descripcion:"El estándar en durabilidad para torneos exigentes.", origen:"Importado" },

  // --- ELÁSTICOS ---
  { id: "elastico-beisbolero", nombre: "Elástico Beisbolero 2½\"", categoria: "Insumos / Elásticos", composicion: "Poliéster / Caucho", gramaje: "2½\"", ancho: "6.5 cm", rendimiento: "N/A", precio_menudeo: 19, precio_mayoreo: 19, unidad: "Metro", descripcion: "Elástico beisbolero de 2½ pulgadas (aprox. 6.5 cm). Ideal para cinturas, uniformes deportivos y aplicaciones de alta tensión.", origen: "MX", colores: ["Blanco", "Negro"] },
  { id: "elastico-3-ligas", nombre: "Elástico 3 Ligas (50cm)", categoria: "Insumos / Elásticos", composicion: "Poliéster / Caucho", gramaje: "3 Ligas", ancho: "50 cm", rendimiento: "N/A", precio_menudeo: 80, precio_mayoreo: 80, unidad: "Pieza", descripcion: "Rollo de elástico de 3 ligas en presentación de 50 cm.", origen: "MX", colores: ["Blanco", "Negro"] },
  { id: "elastico-5-ligas", nombre: "Elástico 5 Ligas (50cm)", categoria: "Insumos / Elásticos", composicion: "Poliéster / Caucho", gramaje: "5 Ligas", ancho: "50 cm", rendimiento: "N/A", precio_menudeo: 100, precio_mayoreo: 100, unidad: "Pieza", descripcion: "Rollo de elástico de 5 ligas en presentación de 50 cm.", origen: "MX", colores: ["Blanco", "Negro"] },
  { id: "elastico-7-ligas", nombre: "Elástico 7 Ligas (50cm)", categoria: "Insumos / Elásticos", composicion: "Poliéster / Caucho", gramaje: "7 Ligas", ancho: "50 cm", rendimiento: "N/A", precio_menudeo: 110, precio_mayoreo: 110, unidad: "Pieza", descripcion: "Rollo de elástico de 7 ligas en presentación de 50 cm.", origen: "MX", colores: ["Blanco", "Negro"] },
  { id: "elastico-10-ligas", nombre: "Elástico 10 Ligas (50cm)", categoria: "Insumos / Elásticos", composicion: "Poliéster / Caucho", gramaje: "10 Ligas", ancho: "50 cm", rendimiento: "N/A", precio_menudeo: 100, precio_mayoreo: 100, unidad: "Pieza", descripcion: "Rollo de elástico de 10 ligas en presentación de 50 cm.", origen: "MX", colores: ["Blanco", "Negro"] },
  { id: "elastico-12-ligas", nombre: "Elástico 12 Ligas (50cm)", categoria: "Insumos / Elásticos", composicion: "Poliéster / Caucho", gramaje: "12 Ligas", ancho: "50 cm", rendimiento: "N/A", precio_menudeo: 110, precio_mayoreo: 110, unidad: "Pieza", descripcion: "Rollo de elástico de 12 ligas en presentación de 50 cm.", origen: "MX", colores: ["Blanco", "Negro"] },
  { id: "elastico-16-ligas", nombre: "Elástico 16 Ligas (50cm)", categoria: "Insumos / Elásticos", composicion: "Poliéster / Caucho", gramaje: "16 Ligas", ancho: "50 cm", rendimiento: "N/A", precio_menudeo: 80, precio_mayoreo: 80, unidad: "Pieza", descripcion: "Rollo de elástico de 16 ligas en presentación de 50 cm.", origen: "MX", colores: ["Blanco", "Negro"] },
  { id: "elastico-20-ligas", nombre: "Elástico 20 Ligas (50cm)", categoria: "Insumos / Elásticos", composicion: "Poliéster / Caucho", gramaje: "20 Ligas", ancho: "50 cm", rendimiento: "N/A", precio_menudeo: 100, precio_mayoreo: 100, unidad: "Pieza", descripcion: "Rollo de elástico de 20 ligas en presentación de 50 cm.", origen: "MX", colores: ["Blanco", "Negro"] },
  { id: "elastico-25-ligas", nombre: "Elástico 25 Ligas (50cm)", categoria: "Insumos / Elásticos", composicion: "Poliéster / Caucho", gramaje: "25 Ligas", ancho: "50 cm", rendimiento: "N/A", precio_menudeo: 100, precio_mayoreo: 100, unidad: "Pieza", descripcion: "Rollo de elástico de 25 ligas en presentación de 50 cm.", origen: "MX", colores: ["Blanco", "Negro"] },
  { id: "elastico-30-ligas", nombre: "Elástico 30 Ligas (50cm)", categoria: "Insumos / Elásticos", composicion: "Poliéster / Caucho", gramaje: "30 Ligas", ancho: "50 cm", rendimiento: "N/A", precio_menudeo: 120, precio_mayoreo: 120, unidad: "Pieza", descripcion: "Rollo de elástico de 30 ligas en presentación de 50 cm.", origen: "MX", colores: ["Blanco", "Negro"] },
  { id: "elastico-jareta-3cm", nombre: "Elástico con Jareta 3 cm", categoria: "Insumos / Elásticos", composicion: "Poliéster / Caucho", gramaje: "3 cm", ancho: "3 cm", rendimiento: "N/A", precio_menudeo: 140, precio_mayoreo: 140, unidad: "Pieza", descripcion: "Elástico con jareta de 3 cm en presentación de cono. Ideal para blusas y pantalones.", origen: "MX", colores: ["Blanco"] },
  { id: "elastico-jareta-4cm", nombre: "Elástico con Jareta 4 cm", categoria: "Insumos / Elásticos", composicion: "Poliéster / Caucho", gramaje: "4 cm", ancho: "4 cm", rendimiento: "N/A", precio_menudeo: 145, precio_mayoreo: 145, unidad: "Pieza", descripcion: "Elástico con jareta de 4 cm en presentación de cono. Ideal para blusas y pantalones.", origen: "MX", colores: ["Blanco"] },

  // --- HILOS ---
  { id: "hilo-kingtex-40-2", nombre: "Hilo Kingtex 40/2 (5,000m)", categoria: "Insumos / Hilos", composicion: "100% Poliéster Fibra Corta", gramaje: "40/2", ancho: "N/A", rendimiento: "5000 metros", precio_menudeo: 29, precio_mayoreo: 25, unidad: "Pieza", descripcion: "Hilo Kingtex 100% poliéster fibra corta. Calidad premium para costura industrial.", origen: "Importado", colores: ["Blanco Óptico", "Negro Industrial", "Crudo / Natural", "Hueso", "Perla", "Marfil", "Gris Iberia", "Gris Plata", "Gris Medio", "Gris Rata", "Gris Oxford", "Charcoal", "Azul Cielo", "Azul Turquesa", "Azul Francia", "Azul Rey", "Azul Eléctrico", "Azul Mezclilla", "Azul Marino Claro", "Azul Marino Obscuro", "Rojo Vivo", "Rojo Bandera", "Rojo Sangre", "Vino / Guinda", "Chedron", "Ladrillo", "Rosa Pastel", "Rosa Baby", "Palo de Rosa", "Fiusha", "Bugambilia", "Magenta", "Amarillo Canario", "Amarillo Oro", "Mango", "Mostaza", "Naranja", "Calabaza", "Verde Limón", "Verde Manzana", "Verde Jade", "Verde Bandera", "Verde Botella", "Verde Militar", "Beige Claro", "Arena", "Kaki", "Camel", "Café Tabaco", "Chocolate", "Lila", "Morado", "Obispo", "Uva", "Verde Neón", "Amarillo Neón", "Naranja Neón", "Rosa Neón"] }
];

type Product = typeof PRODUCTOS[0];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tipo: string;
  producto?: Product;
  time: Date;
}

const WA_NUMBER = "5531314617";

// ============================================================
// MOTOR DE IA: PROCESAMIENTO DE INTENCIÓN Y RESPUESTA
// ============================================================
function procesarMensaje(texto: string, historial: ChatMessage[]) {
  const t = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  
  // -- Verificar primero si hay consulta de producto antes de saludar
  const prodDirecto = encontrarProducto(t);

  // -- Saludos (Solo si no hay un producto mencionado)
  if (!prodDirecto && /^(hola|buenos|buenas|saludos|hey|hi|que tal|qué tal|buen dia|buen dia)/.test(t)) {
    return { tipo: "saludo", respuesta: buildSaludo() };
  }
  
  // -- Precios / cotización
  if (/precio|costo|cuanto|cuánto|cotiza|tarifa|valor|rate/.test(t)) {
    const prod = prodDirecto;
    if (prod) return { tipo: "precio", respuesta: buildPrecio(prod), producto: prod };
    return { tipo: "precios_general", respuesta: buildListaPrecios(t) };
  }
  
  // -- Colores
  if (/color|colores|tonos|tono|disponible en|opciones de color/.test(t)) {
    const prod = prodDirecto;
    if (prod) return { tipo: "colores", respuesta: buildColores(prod), producto: prod };
    return { tipo: "colores_cat", respuesta: buildColoresCategorias() };
  }
  
  // -- Características técnicas
  if (/gramo|gramaje|composic|material|ancho|rendimiento|poliester|poliéster|nylon|spandex|tecni/.test(t)) {
    const prod = prodDirecto;
    if (prod) return { tipo: "ficha", respuesta: buildFichaTecnica(prod), producto: prod };
    return { tipo: "ficha_general", respuesta: buildInfoGeneral() };
  }
  
  // -- Hilos
  if (/hilo|hilos|kingtex|costura|cono/.test(t)) {
    return { tipo: "hilos", respuesta: buildHilos() };
  }
  
  // -- Elásticos
  if (/elastico|elástico|ligas|jareta|resorte|beisbolero/.test(t)) {
    return { tipo: "elasticos", respuesta: buildElasticos() };
  }

  // -- Línea invernal
  if (/invier|polar|flanel|felpa|frio|frío|sudadera|pants|cobija|pijama/.test(t)) {
    return { tipo: "invernal", respuesta: buildLineaInvernal() };
  }
  
  // -- Sublimación
  if (/sublima|sublimacion|sublimación|transfer|dri.?fit|deportiv/.test(t)) {
    return { tipo: "sublimacion", respuesta: buildSublimaciom() };
  }
  
  // -- Licras
  if (/licra|lycra|elastan|spandex|ajustada|gimnasio|gym|elasticidad/.test(t)) {
    return { tipo: "licras", respuesta: buildLicras() };
  }
  
  // -- Rollos / mayoreo
  if (/rollo|mayoreo|mayor|volumen|cantidad|kilo|tonelad/.test(t)) {
    return { tipo: "mayoreo", respuesta: buildMayoreo() };
  }
  
  // -- Producto específico mencionado
  if (prodDirecto) return { tipo: "producto", respuesta: buildProductoCompleto(prodDirecto), producto: prodDirecto };
  
  // -- Catálogo general
  if (/catalogo|catálogo|producto|productos|todo|tienen|que venden|que tienen/.test(t)) {
    return { tipo: "catalogo", respuesta: buildCatalogo() };
  }
  
  // -- Cotizar / pedido / comprar
  if (/comprar|compra|pedir|pedido|ordenar|orden|adquirir|contac|asesor|vendedor|hablar|human/.test(t)) {
    return { tipo: "contacto", respuesta: buildContacto() };
  }
  
  // -- Respuesta por defecto inteligente
  return { tipo: "default", respuesta: buildDefault(texto) };
}

function encontrarProducto(texto: string) {
  const t = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  
  // Búsqueda exacta
  for (const p of PRODUCTOS) {
    const nombre = p.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    if (t.includes(nombre)) return p;
  }
  
  // Búsqueda difusa (Fuzzy Search ligera)
  const palabrasBusqueda = t.split(" ");
  for (const p of PRODUCTOS) {
    const partesNombre = p.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").split(" ");
    if (partesNombre.some(part => part.length > 4 && palabrasBusqueda.includes(part))) {
      return p;
    }
    // Casos especiales para hilos y elásticos
    if (t.includes('kingtex') && p.id === 'hilo-kingtex-40-2') return p;
    if (t.includes('beisbolero') && p.id === 'elastico-beisbolero') return p;
  }
  return null;
}

// ============================================================
// BUILDERS DE RESPUESTA
// ============================================================
function buildSaludo() {
  return `¡Buen día! 👋 Le saluda el equipo de Telas El Coyote.\nSomos distribuidores mayoristas de telas técnicas, insumos y mercería con cobertura nacional. Contamos con múltiples líneas de producto:\n📦 Deportivas / Sublimación\n🏋️ Deportivo / Licra\n❄️ Línea Invernal\n🎓 Escolar / Deportivo\n🧵 Insumos (Hilos y Elásticos)\n🔩 Telas Técnicas\n\n¿En qué puedo orientarle el día de hoy?`;
}

function buildPrecio(p: Product) {
  return `💰 Precios — ${p.nombre}\n\n| Modalidad | Precio por ${p.unidad} |\n|---|---|\n| Menudeo | $${p.precio_menudeo}.00 MXN |\n| Mayoreo | $${p.precio_mayoreo}.00 MXN |\n\n📌 El precio de mayoreo aplica a partir de rollos o cajas completas.\n📐 Datos clave:\n• Rendimiento/Medida: ${p.rendimiento !== 'N/A' ? p.rendimiento : p.ancho}\n${p.rollo_metros ? `• Rollo: ${p.rollo_metros} metros\n` : ''}${p.rollo_kg ? `• Rollo: ${p.rollo_kg} kg\n` : ''}\n¿Le gustaría realizar una cotización formal o conocer disponibilidad de colores?`;
}

function buildListaPrecios(t: string) {
  const esSub = /sublima|deportiv/.test(t);
  const esInv = /invier|polar|flanel|felpa/.test(t);
  const esLicra = /licra|lycra|elastan/.test(t);
  const esEscolar = /escolar|sportok|pants/.test(t);
  const esInsumos = /hilo|elastico|liga|jareta/.test(t);
  
  let lista = PRODUCTOS;
  let cat = "General";
  
  if (esSub) { lista = PRODUCTOS.filter(p => p.categoria === "Deportivas / Sublimación"); cat = "Deportivas / Sublimación"; }
  else if (esInv) { lista = PRODUCTOS.filter(p => p.categoria === "Línea Invernal"); cat = "Línea Invernal"; }
  else if (esLicra) { lista = PRODUCTOS.filter(p => p.categoria === "Deportivo / Licra"); cat = "Deportivo / Licra"; }
  else if (esEscolar) { lista = PRODUCTOS.filter(p => p.categoria === "Escolar / Deportivo"); cat = "Escolar / Deportivo"; }
  else if (esInsumos) { lista = PRODUCTOS.filter(p => p.categoria.includes("Insumos")); cat = "Insumos y Mercería"; }
  
  const items = lista.slice(0, 12).map(p =>
    `• *${p.nombre}* — Menudeo $${p.precio_menudeo} / Mayoreo $${p.precio_mayoreo} por ${p.unidad}`
  ).join('\n');
  
  return `📋 *Lista de Precios — ${cat}*\n\n${items}${lista.length > 12 ? `\n\n_...y ${lista.length - 12} productos más._` : ''}\n\n¿Desea información detallada de algún producto en particular?`;
}

function buildColores(p: Product) {
  if (!p.colores || p.colores.length === 0) {
    return `ℹ️ *${p.nombre}* se trabaja en color único. Ideal para su aplicación principal.\n\n¿Le gustaría cotizar o saber más de sus características?`;
  }
  const colorList = p.colores.slice(0, 15).map((c: string) => `• ${c}`).join('\n');
  const extras = p.colores.length > 15 ? `\n_...y ${p.colores.length - 15} tonos más._` : '';
  return `🎨 *Colores disponibles — ${p.nombre}*\n\n${colorList}${extras}\n\n_Total: ${p.colores.length} colores en stock._\n\n¿Desea cotizar en algún color específico?`;
}

function buildColoresCategorias() {
  const conColores = PRODUCTOS.filter(p => p.colores && p.colores.length > 5);
  const texto = conColores.slice(0, 8).map(p => `• *${p.nombre}* — ${p.colores!.length} colores`).join('\n');
  return `🎨 *Productos con amplia paleta de colores*\n\n${texto}\n\nMencione el nombre del producto que le interese y le comparto el catálogo de colores.`;
}

function buildFichaTecnica(p: Product) {
  return `🧵 Ficha Técnica — ${p.nombre}\n📁 Categoría: ${p.categoria}\n🧪 Composición: ${p.composicion}\n⚖️ Gramaje: ${p.gramaje}\n📏 Ancho/Medida: ${p.ancho}\n📦 Unidad de venta: ${p.unidad}\n📐 Rendimiento: ${p.rendimiento}\n🌍 Origen: ${p.origen}\n📝 Descripción:\n${p.descripcion}\n💰 Menudeo: $${p.precio_menudeo} / Mayoreo: $${p.precio_mayoreo} por ${p.unidad}\n\n¿Le puedo apoyar con una cotización?`;
}

function buildHilos() {
  const hilos = PRODUCTOS.filter(p => p.categoria === "Insumos / Hilos");
  const p = hilos[0];
  return `🧵 *Insumos: Hilos para Confección*\n\nContamos con la línea premium:\n• *${p.nombre}*\n\n💰 *Precios:*\nMenudeo: $${p.precio_menudeo}.00 MXN x pieza\nMayoreo: $${p.precio_mayoreo}.00 MXN x pieza (Caja con 120 pzs)\n\n🎨 *Catálogo de Colores:*\nManejamos más de ${p.colores?.length} tonos en stock, incluyendo neutros, escolares, neones y de alta visibilidad.\n\nEscriba "colores kingtex" para ver la lista completa.`;
}

function buildElasticos() {
  const elasticos = PRODUCTOS.filter(p => p.categoria === "Insumos / Elásticos");
  const beisbolero = elasticos.find(e => e.id === "elastico-beisbolero");
  const jaretas = elasticos.filter(e => e.id.includes("jareta"));
  
  return `📏 *Insumos: Elásticos y Resortes*\n\nContamos con 3 líneas principales:\n\n1️⃣ *Elástico por Ligas (Rollos de 50cm)*\nDesde 3 hasta 30 ligas. Precios entre $80 y $120 MXN por rollo.\n\n2️⃣ *${beisbolero?.nombre}*\n$${beisbolero?.precio_menudeo} MXN por ${beisbolero?.unidad}. Ideal para cinturas deportivas.\n\n3️⃣ *Elásticos con Jareta*\n• 3 cm — $${jaretas[0]?.precio_menudeo} MXN\n• 4 cm — $${jaretas[1]?.precio_menudeo} MXN\n\nTodos disponibles en Blanco y Negro (excepto jaretas, solo blanco).\n¿Qué tipo de elástico necesita para su producción?`;
}

function buildInfoGeneral() {
  return `🔬 Información Técnica General\n\n🏅 Deportivas / Sublimación\n— 100% Poliéster | 140–185 g/m² | Rendimiento: 3.7–4.3 m/kg\n\n🏋️ Deportivo / Licra\n— Poliéster / Spandex | 180 g/m² | Rendimiento: 3.5 m/kg\n\n❄️ Línea Invernal\n— 100% Poliéster o 50/50 | 260–280 g/m² | Rendimiento: 2.2–2.5 m/kg\n\n🧵 Insumos\n— Hilos: Kingtex 40/2 (5,000m)\n— Elásticos: Beisbolero (6.5cm), Ligas (50cm), Jaretas.\n\n¿De qué línea necesita más información?`;
}

function buildLineaInvernal() {
  const inv = PRODUCTOS.filter(p => p.categoria === "Línea Invernal");
  const lista = inv.map(p =>
    `*${p.nombre}* — $${p.precio_menudeo}/$${p.precio_mayoreo} por ${p.unidad}\n  ${p.composicion} | ${p.gramaje} | ${p.colores ? p.colores.length + ' colores' : 'color único'}`
  ).join('\n\n');
  return `❄️ *Línea Invernal — Catálogo Completo*\n\n${lista}\n\n🧥 Ideales para: sudaderas, pants, pijamas, cobijas y uniformes escolares.\n\n¿Le interesa alguna en particular?`;
}

function buildSublimaciom() {
  const subs = PRODUCTOS.filter(p => p.categoria === "Deportivas / Sublimación");
  const rangoPrecio = { min: Math.min(...subs.map(p=>p.precio_menudeo)), max: Math.max(...subs.map(p=>p.precio_menudeo)) };
  return `🎽 Línea Deportiva para Sublimación\nContamos con ${subs.length} referencias especializadas:\n\n✅ 100% Poliéster de alta calidad\n✅ Gramajes entre 140–185 g/m²\n✅ Acabado blanco óptico para máxima fidelidad de color\n\n💰 Rango de precios: $${rangoPrecio.min}–$${rangoPrecio.max} por kilo (menudeo)\n\nDestacadas:\n• Delta / Super Trix — $175/kg (premium)\n• Panal Nitro — $185/kg (control de humedad)\n• Micro Piqué / Micro Panal — desde $100/kg\n\n¿Desea asesoría técnica?`;
}

function buildLicras() {
  const licras = PRODUCTOS.filter(p => p.categoria === "Deportivo / Licra");
  const lista = licras.map(p => `• *${p.nombre}* — $${p.precio_menudeo}/$${p.precio_mayoreo} por ${p.unidad}`).join('\n');
  return `🏋️ *Línea Deportivo / Licra*\n\n${lista}\n\n🔍 Todas con composición *Poliéster / Spandex* excepto Lycra Metálica (100% Poliéster, 13 colores).\n\n¿Le interesa alguna referencia específica?`;
}

function buildMayoreo() {
  return `📦 Información sobre Mayoreo\n\nPara compras al precio de mayoreo:\n• *Telas por Kilo:* Aplica comprando el rollo completo (aprox. 25–30 kg).\n• *Telas por Metro:* Aplica comprando el rollo cerrado (ej. Diablo 50m).\n• *Hilos:* Aplica comprando la caja cerrada (120 pzs).\n• *Elásticos:* Aplica en compras por volumen según la presentación.\n\n💬 Para confirmar disponibilidad exacta, comuníquese con nuestro equipo de ventas.`;
}

function buildProductoCompleto(p: Product) {
  return `📦 ${p.nombre}\n🏷️ Categoría: ${p.categoria}\n🧪 Composición: ${p.composicion}\n📏 Medida/Ancho: ${p.ancho}\n💰 Precios:\n• Menudeo: $${p.precio_menudeo}.00 MXN / ${p.unidad}\n• Mayoreo: $${p.precio_mayoreo}.00 MXN / ${p.unidad}\n${p.colores ? `🎨 *${p.colores.length} colores disponibles*\n` : `✏️ Color único\n`}\n📝 ${p.descripcion}\n\n¿Desea cotizar, ver colores o hablar con un asesor?`;
}

function buildCatalogo() {
  const porCat: Record<string, string[]> = {};
  for (const p of PRODUCTOS) {
    if (!porCat[p.categoria]) porCat[p.categoria] = [];
    porCat[p.categoria].push(p.nombre);
  }
  let texto = `🗂️ *Catálogo General — Telas El Coyote*\n\n`;
  for (const [cat, prods] of Object.entries(porCat)) {
    texto += `*${cat}* (${prods.length})\n${prods.join(', ')}\n\n`;
  }
  texto += `Mencione el nombre de cualquier producto para ver ficha técnica y precios.`;
  return texto;
}

function buildContacto() {
  return `✅ Conectar con un Asesor de Ventas\n\nNuestro equipo está listo para atenderle con:\n📋 Cotizaciones personalizadas\n📦 Consulta de inventario en tiempo real\n🚚 Envíos y logística\n\nPara continuar directamente en WhatsApp, presione el botón de abajo. 👇`;
}

function buildDefault(texto: string) {
  return `Gracias por su mensaje.\n\nPuedo ayudarle con la siguiente información:\n• 🔍 Búsqueda de telas y mercería\n• 💰 Precios de menudeo y mayoreo\n• 🎨 Paleta de colores disponibles\n• 📐 Fichas técnicas\n• ❄️ Línea invernal (felpa, polar)\n• 🎽 Deportivas y Sublimación\n• 🧵 Insumos (Hilos Kingtex y Elásticos)\n\n¿Sobre qué producto le puedo orientar?`;
}

// ============================================================
// SUGERENCIAS RÁPIDAS CONTEXTUALES
// ============================================================
function getSugerencias(tipo: string): string[] {
  const map: Record<string, string[]> = {
    saludo: ["Ver catálogo", "Precios generales", "Línea invernal", "Hilos y Elásticos"],
    catalogo: ["Telas Sublimación", "Línea invernal", "Catálogo de Hilos", "Elásticos"],
    invernal: ["Precio Polar", "Colores Flanel", "Precio Felpa China", "Cotizar rollo"],
    sublimacion: ["Precio Alaska", "Precio Micro Piqué", "Colores Micro Panal", "Hablar con asesor"],
    licras: ["Precio Licra Saludable", "Colores Lycra Metálica", "Precio Mercury", "Cotizar"],
    mayoreo: ["Rollo Sportok", "Rollo Polar", "Caja de Hilos", "Hablar con asesor"],
    hilos: ["Colores Kingtex", "Precios Mayoreo", "Elásticos", "Hablar con asesor"],
    elasticos: ["Elástico Beisbolero", "Elástico 10 ligas", "Elástico con Jareta", "Hilos"],
    producto: ["Ver precios", "Ver colores", "Ficha técnica", "Hablar con asesor"],
    precio: ["Ver colores", "Ficha técnica", "Comprar ahora", "Hablar con asesor"],
    colores: ["Ver precio", "Cotizar", "Hablar con asesor"],
    contacto: [],
    default: ["Ver catálogo", "Línea invernal", "Hilos y Elásticos", "Hablar con asesor"],
  };
  return map[tipo] || map.default;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function CoyoteWhatsApp() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: buildSaludo(),
      tipo: 'saludo',
      time: new Date()
    }
  ]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const addMessage = async (userText: string) => {
    if (!userText.trim()) return;
    const now = new Date();
    setMessages(prev => [...prev, { role: 'user', content: userText, tipo: '', time: now }]);
    setInput('');
    setTyping(true);
    
    const delay = Math.min(800 + userText.length * 12, 2200);
    await new Promise(r => setTimeout(r, delay));
    
    const resultado = procesarMensaje(userText, messages);
    setTyping(false);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: resultado.respuesta,
      tipo: resultado.tipo,
      producto: resultado.producto,
      time: new Date()
    }]);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (input.trim() && !typing) addMessage(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSugerencia = (s: string) => {
    if (!typing) addMessage(s);
  };

  const openWhatsApp = (msg = '') => {
    const text = msg
      ? `Hola, me interesa: ${msg}`
      : `Hola, vengo del chat de El Coyote y deseo más información.`;
    window.open(`https://wa.me/52${WA_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const lastMsg = messages[messages.length - 1];
  const sugerencias = lastMsg?.tipo ? getSugerencias(lastMsg.tipo) : [];
  const formatTime = (d: Date) => d ? d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';

  const renderMsg = (text: string) => {
    return text.split('\n').map((line: string, i: number) => {
      const parts = line.split(/(\*[^*]+\*)/g).map((part: string, j: number) => {
        if (part.startsWith('*') && part.endsWith('*')) {
          return <strong key={j}>{part.slice(1, -1)}</strong>;
        }
        return part;
      });
      return <span key={i}>{parts}<br /></span>;
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        .wa-widget * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
        .wa-window {
          position: fixed;
          bottom: 90px;
          right: 20px;
          width: 360px;
          max-width: calc(100vw - 32px);
          height: 600px;
          max-height: calc(100vh - 110px);
          background: #ECE5DD;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 9998;
          transition: opacity .25s, transform .25s;
        }
        .wa-window.closed { opacity:0; pointer-events:none; transform: scale(0.92) translateY(16px); }
        .wa-window.open { opacity:1; transform: scale(1) translateY(0); }
        .wa-header {
          background: #075E54;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .wa-avatar {
          width: 42px; height: 42px;
          background: #25D366;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }
        .wa-header-info { flex: 1; }
        .wa-header-name { color: white; font-size: 15px; font-weight: 600; line-height: 1.2; }
        .wa-header-status { color: #b2dfdb; font-size: 12px; }
        .wa-header-close {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
          transition: background .2s;
        }
        .wa-header-close:hover { background: rgba(255,255,255,0.22); }
        .wa-banner {
          background: linear-gradient(90deg, #25D366, #075E54);
          color: white;
          padding: 10px 14px;
          text-align: center;
          font-size: 15px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-shrink: 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .wa-bg {
          position: absolute;
          inset: 60px 0 0 0;
          background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10 Q15 5 20 10 Q25 15 30 10 Q35 5 40 10 Q45 15 50 10 Q55 5 60 10 Q65 15 70 10 Q75 5 80 10 Q85 15 90 10' stroke='%23b2bec3' stroke-width='1' fill='none' opacity='0.15'/%3E%3C/svg%3E");
          background-color: #e5ddd5;
          pointer-events: none;
          z-index: 0;
        }
        .wa-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px 12px 8px;
          position: relative;
          z-index: 1;
          scroll-behavior: smooth;
        }
        .wa-messages::-webkit-scrollbar { width: 4px; }
        .wa-messages::-webkit-scrollbar-track { background: transparent; }
        .wa-messages::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
        .wa-msg { display: flex; margin-bottom: 4px; }
        .wa-msg.user { justify-content: flex-end; }
        .wa-msg.bot { justify-content: flex-start; }
        .wa-bubble {
          max-width: 82%;
          padding: 7px 10px 6px;
          border-radius: 7.5px;
          font-size: 13.5px;
          line-height: 1.45;
          position: relative;
          word-break: break-word;
          box-shadow: 0 1px 1px rgba(0,0,0,0.1);
        }
        .wa-bubble.user {
          background: #DCF8C6;
          border-top-right-radius: 2px;
        }
        .wa-bubble.bot {
          background: white;
          border-top-left-radius: 2px;
        }
        .wa-bubble .wa-time {
          font-size: 10px;
          color: #8696a0;
          float: right;
          margin-left: 8px;
          margin-top: 2px;
          line-height: 1;
        }
        .wa-bubble.user .wa-time::after {
          content: ' ✓✓';
          color: #53bdeb;
        }
        .wa-typing {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 10px 14px;
          background: white;
          border-radius: 7.5px;
          border-top-left-radius: 2px;
          width: fit-content;
          box-shadow: 0 1px 1px rgba(0,0,0,0.1);
        }
        .wa-dot {
          width: 8px; height: 8px;
          background: #8696a0;
          border-radius: 50%;
          animation: waDot 1.2s infinite ease-in-out;
        }
        .wa-dot:nth-child(2) { animation-delay: 0.2s; }
        .wa-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes waDot {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }
        .wa-suggestions {
          padding: 6px 12px;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          background: #e5ddd5;
          position: relative;
          z-index: 1;
        }
        .wa-chip {
          background: white;
          border: 1px solid #25D366;
          color: #075E54;
          font-size: 12px;
          font-weight: 500;
          padding: 5px 10px;
          border-radius: 16px;
          cursor: pointer;
          transition: all .15s;
          white-space: nowrap;
        }
        .wa-chip:hover { background: #25D366; color: white; }
        .wa-wa-btn {
          margin: 6px 12px;
          background: #25D366;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 11px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background .2s;
          position: relative;
          z-index: 1;
        }
        .wa-wa-btn:hover { background: #1da851; }
        .wa-input-area {
          padding: 8px 10px;
          background: #f0f2f5;
          display: flex;
          align-items: flex-end;
          gap: 8px;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }
        .wa-input-wrap {
          flex: 1;
          background: white;
          border-radius: 22px;
          display: flex;
          align-items: flex-end;
          padding: 8px 14px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .wa-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 14px;
          outline: none;
          resize: none;
          max-height: 80px;
          min-height: 20px;
          line-height: 1.4;
          color: #111b21;
          font-family: inherit;
        }
        .wa-send-btn {
          width: 42px; height: 42px;
          background: #25D366;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: background .2s;
          color: white;
        }
        .wa-send-btn:hover { background: #1da851; }
        .wa-send-btn:disabled { background: #c4c4c4; cursor: not-allowed; }
        .wa-fab {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 60px; height: 60px;
          background: #25D366;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 20px rgba(37,211,102,0.45);
          z-index: 9999;
          transition: transform .2s, box-shadow .2s;
        }
        .wa-fab:hover { transform: scale(1.08); box-shadow: 0 10px 30px rgba(37,211,102,0.55); }
        .wa-fab:active { transform: scale(0.95); }
        .wa-fab-ping {
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          background: #25D366;
          opacity: 0.3;
          animation: waPing 2s infinite;
        }
        @keyframes waPing {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.25); opacity: 0; }
        }
        .wa-badge {
          position: absolute;
          top: -2px; right: -2px;
          width: 18px; height: 18px;
          background: #FF5722;
          border-radius: 50%;
          border: 2px solid white;
          font-size: 10px;
          font-weight: 700;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wa-date-sep {
          text-align: center;
          margin: 8px 0;
        }
        .wa-date-sep span {
          background: rgba(225,245,254,0.9);
          color: #667781;
          font-size: 11.5px;
          padding: 3px 10px;
          border-radius: 8px;
        }
      `}</style>

      <div className="wa-widget">
        <div className={`wa-window ${isOpen ? 'open' : 'closed'}`}>
          <div className="wa-header">
            <div className="wa-avatar">🐺</div>
            <div className="wa-header-info">
              <div className="wa-header-name">Telas El Coyote</div>
              <div className="wa-header-status">{typing ? 'escribiendo...' : 'En línea'}</div>
            </div>
            <button className="wa-header-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="wa-banner">
            🚀 ¡Cotizar Ahora!
            <button
              onClick={() => openWhatsApp()}
              style={{
                background: 'white',
                color: '#075E54',
                border: 'none',
                padding: '4px 14px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              Contactar por WhatsApp
            </button>
          </div>

          <div className="wa-bg" />

          <div ref={scrollRef} className="wa-messages">
            <div className="wa-date-sep"><span>Hoy</span></div>
            {messages.map((msg, i) => (
              <div key={i} className={`wa-msg ${msg.role === 'user' ? 'user' : 'bot'}`}>
                <div className={`wa-bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
                  {renderMsg(msg.content)}
                  <span className="wa-time">{formatTime(msg.time)}</span>
                </div>
              </div>
            ))}
            {typing && (
              <div className="wa-msg bot">
                <div className="wa-typing">
                  <div className="wa-dot" />
                  <div className="wa-dot" />
                  <div className="wa-dot" />
                </div>
              </div>
            )}
          </div>

          {sugerencias.length > 0 && !typing && (
            <div className="wa-suggestions">
              {sugerencias.map((s, i) => (
                <button key={i} className="wa-chip" onClick={() => handleSugerencia(s)}>{s}</button>
              ))}
            </div>
          )}

          <button
            className="wa-wa-btn"
            onClick={() => {
              const prod = lastMsg?.producto;
              openWhatsApp(prod ? `${prod.nombre} ($${prod.precio_menudeo}/${prod.precio_mayoreo} por ${prod.unidad})` : '');
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Continuar en WhatsApp
          </button>

          <div className="wa-input-area">
            <div className="wa-input-wrap">
              <textarea
                ref={inputRef}
                className="wa-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escriba su consulta..."
                rows={1}
              />
            </div>
            <button
              className="wa-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || typing}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>

        <button className="wa-fab" onClick={() => setIsOpen(o => !o)}>
          <div className="wa-fab-ping" />
          {!isOpen && <div className="wa-badge">1</div>}
          {isOpen
            ? <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            : <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          }
        </button>
      </div>
    </>
  );
}