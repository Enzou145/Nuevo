import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Conexión automática usando tus variables de Vercel
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    // 1. Buscamos préstamos no finalizados
    const { data: prestamos, error } = await supabase
      .from('prestamos')
      .select('*, clientes(nombre, apellido)')
      .neq('estado_prestamo', 'finalizado');

    if (error) throw error;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    let vencidosHoy = [];

    // 2. Lógica de fechas (la misma que usas en tu app)
    prestamos.forEach(p => {
      const cuotaSiguiente = (p.cuotas_pagadas || 0) + 1;
      const intervalo = p.intervalo_pago || 1;
      const frecuencia = (p.frecuencia_pago || "diario").toLowerCase();
      
      let fechaVencimiento = new Date(p.fecha_inicio + 'T00:00:00');
      
      if (frecuencia.includes("diario")) {
        fechaVencimiento.setDate(fechaVencimiento.getDate() + (cuotaSiguiente * intervalo));
      } else if (frecuencia.includes("semanal")) {
        fechaVencimiento.setDate(fechaVencimiento.getDate() + (cuotaSiguiente * intervalo * 7));
      } else if (frecuencia.includes("mensual")) {
        fechaVencimiento.setMonth(fechaVencimiento.getMonth() + (cuotaSiguiente * intervalo));
      }

      fechaVencimiento.setHours(0, 0, 0, 0);

      // Si la cuota venció ayer o antes, y hoy el sistema lo detecta
      if (fechaVencimiento < hoy) {
        vencidosHoy.push(`${p.clientes.nombre} ${p.clientes.apellido}`);
      }
    });

    // 3. Enviar notificación si hay vencidos
    if (vencidosHoy.length > 0) {
      await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Authorization": `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify({
          app_id: "69853c34-00e4-46ca-9d17-ef926cf8660f", // Tu ID de OneSignal
          included_segments: ["Total Subscriptions"],
          headings: { "es": "⚠️ Cobros Vencidos" },
          contents: { "es": `Hoy se vencieron cuotas de: ${vencidosHoy.join(', ')}` }
        })
      });
    }

    return res.status(200).json({ success: true, informados: vencidosHoy });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}