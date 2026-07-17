import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: prestamos, error } = await supabase
      .from('prestamos')
      .select('*, clientes(nombre, apellido)')
      .neq('estado_prestamo', 'finalizado');

    if (error) throw error;

    // Ajustar fecha actual a la zona horaria de Argentina (UTC-3)
    const hoy = new Date();
    hoy.setHours(hoy.getHours() - 3);
    hoy.setHours(0, 0, 0, 0);
    let vencidosHoy = [];
    let debugInfo = [];

    prestamos.forEach(p => {
      const cuotaSiguiente = (p.cuotas_pagadas || 0) + 1;
      const intervalo = p.intervalo_pago || 1;
      const frecuencia = (p.frecuencia_pago || "diario").toLowerCase();
      let fechaVencimiento = new Date(p.fecha_inicio + 'T00:00:00');
      
      if (frecuencia.includes("diario")) fechaVencimiento.setDate(fechaVencimiento.getDate() + (cuotaSiguiente * intervalo));
      else if (frecuencia.includes("semanal")) fechaVencimiento.setDate(fechaVencimiento.getDate() + (cuotaSiguiente * intervalo * 7));
      else if (frecuencia.includes("mensual")) fechaVencimiento.setMonth(fechaVencimiento.getMonth() + (cuotaSiguiente * intervalo));
      else if (frecuencia.includes("1 pago")) fechaVencimiento = new Date((p.fecha_fin || p.fecha_inicio) + 'T00:00:00');

      fechaVencimiento.setHours(0, 0, 0, 0);
      // Si la fecha de vencimiento es igual o menor a hoy (vence hoy o ya está atrasado)
      if (fechaVencimiento <= hoy) vencidosHoy.push(`${p.clientes.nombre} ${p.clientes.apellido}`);
      
      debugInfo.push({
          cliente: p.clientes?.nombre,
          frecuencia: frecuencia,
          cuotaSiguiente: cuotaSiguiente,
          fechaVencimientoCalculada: fechaVencimiento.toISOString(),
          esMenorOIgualAHoy: fechaVencimiento <= hoy
      });
    });

    if (vencidosHoy.length > 0) {
      const response = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Authorization": `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify({
          app_id: "69853c34-00e4-46ca-9d17-ef926cf8660f",
          included_segments: ["Subscribed Users"],
          // Agregamos "en" para que OneSignal no de error
          headings: { 
            "en": "⚠️ Cobros Vencidos",
            "es": "⚠️ Cobros Vencidos" 
          },
          contents: { 
            "en": `Hoy vencen cuotas de: ${vencidosHoy.join(', ')}`,
            "es": `Hoy vencen cuotas de: ${vencidosHoy.join(', ')}` 
          }
        })
    });

      const oneSignalData = await response.json();
      
      // Si OneSignal devuelve un error, lo veremos en el navegador
      if (!response.ok) {
        return res.status(response.status).json({ error: "Error de OneSignal", details: oneSignalData });
      }

      return res.status(200).json({ 
        success: true, 
        informados: vencidosHoy,
        onesignal_response: oneSignalData,
        debug: debugInfo
      });
    }

    return res.status(200).json({ 
        success: true, 
        informados: vencidosHoy,
        debug: debugInfo
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}