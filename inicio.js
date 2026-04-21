// inicio.js

const CAPITAL_TOTAL_FIJO = 1000000;

const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
    }).format(valor);
};



// ------------------- FUNCIÓN 1: RESUMEN DE CAPITAL -------------------
// ------------------- FUNCIÓN 1: RESUMEN DE CAPITAL -------------------
async function cargarResumenCapital() {
    try {
        const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado"));
        const userId = usuarioLogueado?.auth_user_id || usuarioLogueado?.id;
        
        if (!userId) return;

        // Traemos todos los préstamos para los cálculos históricos
        const { data: prestamos, error } = await supabaseClient
            .from('prestamos')
            .select('monto_prestado, total_devolver, cuotas_pagadas, valor_cuota, estado_prestamo')
            .eq('user_id', userId);

        if (error) throw error;

        let totalMontoPrestadoHistorico = 0; // Se seguirá sumando siempre
        let totalRecaudadoHistorico = 0;    // Dinero que ya entró a la caja
        let totalAdeudaActual = 0;          // Solo lo que falta cobrar de préstamos activos

        prestamos.forEach(p => {
            const monto = Number(p.monto_prestado) || 0;
            const valorCuota = Number(p.valor_cuota) || 0;
            const cuotasPagadas = Number(p.cuotas_pagadas) || 0;
            const totalDevolver = Number(p.total_devolver) || 0;

            const recaudado = cuotasPagadas * valorCuota;
            
            // 1. Acumulamos TODO lo prestado (no baja a 0 aunque terminen)
            totalMontoPrestadoHistorico += monto;
            
            // 2. Acumulamos TODO lo cobrado (para la caja)
            totalRecaudadoHistorico += recaudado;

            // 3. Calculamos lo que falta cobrar (solo de los que no han terminado)
            if (p.estado_prestamo !== 'finalizado') {
                const adeuda = totalDevolver - recaudado;
                if (adeuda > 0) totalAdeudaActual += adeuda;
            }
        });

        // LÓGICA DE CAJA: Dinero disponible = Inicial - Todo lo que salió + Todo lo que entró
        const capitalTotalActual = CAPITAL_TOTAL_FIJO - totalMontoPrestadoHistorico + totalRecaudadoHistorico;

        // --- ANIMACIONES ---
        
        // Tarjeta 1: Capital Inicial (El millón fijo)
        animarContador('total-fijo', CAPITAL_TOTAL_FIJO);
        
        // Tarjeta 2: Capital Total (Dinero real en mano hoy)
        animarContador('total-disponible', capitalTotalActual);
        
        // Tarjeta 3: Capital Prestado (Historial acumulado, NO vuelve a 0)
        animarContador('total-prestado', totalMontoPrestadoHistorico);
        
        // Tarjeta 4: A Recuperar (Solo lo que te deben hoy)
        animarContador('total-recuperar', totalAdeudaActual);

    } catch (err) {
        console.error("Error en resumen:", err.message);
    }
}


// ------------- FUNCIÓN 2: GRÁFICO DE TORTA --------------------
// ------------- FUNCIÓN 2: GRÁFICO DE TORTA --------------------

let chartInstancia = null;

async function cargarGraficoClientes() {
    try {
        const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado"));
        const userId = usuarioLogueado?.auth_user_id || usuarioLogueado?.id;

        if (!userId) return;

        const { data: clientes, error } = await supabaseClient
            .from('clientes')
            .select('estado')
            .eq('user_id', userId);

        if (error) throw error;

        const conteo = { aldia: 0, atrasado: 0, sinprestamo: 0, porvencer: 0 };
        let totalReal = 0; // Nueva variable para contar solo los que no están finalizados

        clientes.forEach(c => {
            const est = (c.estado || "").toLowerCase().trim()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            // --- CORRECCIÓN: Si el estado es "finalizado", lo saltamos ---
            if (est.includes("finalizado")) {
                return; // No suma a ninguna categoría ni al total
            }

            if (est.includes("atrasado") || est.includes("mora")) {
                conteo.atrasado++;
                totalReal++;
            } else if (est.includes("vencer") || est.includes("manana") || est.includes("proximo")) {
                conteo.porvencer++;
                totalReal++;
            } else if (est.includes("dia") || est.includes("activo")) {
                conteo.aldia++;
                totalReal++;
            } else {
                conteo.sinprestamo++;
                totalReal++;
            }
        });

        // Actualizamos el centro de la torta con el nuevo total filtrado
        document.getElementById('torta-total').innerText = totalReal;
        
        document.getElementById('num-aldia').innerText = conteo.aldia;
        document.getElementById('num-atrasados').innerText = conteo.atrasado;
        document.getElementById('num-sinprestamo').innerText = conteo.sinprestamo;
        document.getElementById('num-porvencer').innerText = conteo.porvencer;

        const canvas = document.getElementById('chartClientes');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (chartInstancia) chartInstancia.destroy();

        chartInstancia = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Al día', 'Atrasados', 'Sin préstamo', 'Próximos a Vencer'],
                datasets: [{
                    data: [conteo.aldia, conteo.atrasado, conteo.sinprestamo, conteo.porvencer],
                    backgroundColor: ['#3b82f6', '#ef4444', '#6b7280', '#eab308'],
                    borderWidth: 0,
                }]
            },
            options: {
                cutout: '75%',
                plugins: { legend: { display: false } },
                responsive: true,
                maintainAspectRatio: false
            }
        });

    } catch (err) {
        console.error("Error en gráfico:", err.message);
    }
}





// ------------- FUNCIÓN 3: PROXIMOS COBROS --------------------
// ------------- FUNCIÓN 3: PROXIMOS COBROS --------------------
async function cargarProximosCobros() {
    try {
        const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado"));
        const userId = usuarioLogueado?.auth_user_id || usuarioLogueado?.id;

        if (!userId) return;

        const { data: prestamos, error } = await supabaseClient
            .from('prestamos')
            .select(`
                valor_cuota, 
                estado_prestamo, 
                fecha_inicio, 
                cuotas_pagadas, 
                cuotas_totales,
                intervalo_pago,
                frecuencia_pago,
                clientes (nombre, apellido)
            `)
            .eq('user_id', userId)
            .neq('estado_prestamo', 'finalizado');

        if (error) throw error;

        const listaContenedor = document.getElementById('lista-cobros');
        listaContenedor.innerHTML = "";

        // 1. Mapear y calcular datos de cada préstamo
        const cobrosProcesados = prestamos.map(p => {
            const cuotaSiguiente = (p.cuotas_pagadas || 0) + 1;
            const intervalo = p.intervalo_pago || 1;
            const frecuencia = (p.frecuencia_pago || "diario").toLowerCase();
            
            // Calculamos la fecha de la próxima cuota
            // Fecha Inicio + (Nro Cuota * Intervalo * Dias de Frecuencia)
            let fechaVencimiento = new Date(p.fecha_inicio);
            fechaVencimiento.setMinutes(fechaVencimiento.getMinutes() + fechaVencimiento.getTimezoneOffset()); // Ajuste zona horaria

            if (frecuencia.includes("diario")) {
                fechaVencimiento.setDate(fechaVencimiento.getDate() + (cuotaSiguiente * intervalo));
            } else if (frecuencia.includes("semanal")) {
                fechaVencimiento.setDate(fechaVencimiento.getDate() + (cuotaSiguiente * intervalo * 7));
            } else if (frecuencia.includes("mensual")) {
                fechaVencimiento.setMonth(fechaVencimiento.getMonth() + (cuotaSiguiente * intervalo));
            }

            // Comparar con hoy
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            fechaVencimiento.setHours(0, 0, 0, 0);

            const diffTiempo = fechaVencimiento - hoy;
            const diffDias = Math.round(diffTiempo / (1000 * 60 * 60 * 24));

            return {
                nombre: `${p.clientes.nombre} ${p.clientes.apellido}`,
                monto: p.valor_cuota,
                diasFaltantes: diffDias,
                estadoOriginal: p.estado_prestamo
            };
        });

        // 2. Ordenar: Primero los vencidos (negativos), luego los de hoy (0), luego los más cercanos
        cobrosProcesados.sort((a, b) => a.diasFaltantes - b.diasFaltantes);

        // 3. Renderizar los primeros 5 o todos los urgentes
        cobrosProcesados.forEach(c => {
            let textoFecha = "";
            let esUrgente = false;

            if (c.diasFaltantes < 0 || c.estadoOriginal.toLowerCase().includes("atrasado")) {
                textoFecha = "⚠️ Vencido";
                esUrgente = true;
            } else if (c.diasFaltantes === 0) {
                textoFecha = "Vence hoy";
                esUrgente = false; 
            } else if (c.diasFaltantes === 1) {
                textoFecha = "Vence mañana";
            } else {
                textoFecha = `Vence en ${c.diasFaltantes} días`;
            }

            const li = document.createElement('li');
            li.className = `cobro-item ${esUrgente ? 'cobro-item--urgente' : ''}`;
            li.innerHTML = `
                <div class="cobro-info">
                    <span class="cobro-nombre">${c.nombre}</span>
                    <span class="cobro-fecha ${esUrgente ? 'cobro-fecha--urgente' : ''}">${textoFecha}</span>
                </div>
                <span class="cobro-monto ${esUrgente ? 'cobro-monto--urgente' : ''}">${formatearMoneda(c.monto)}</span>
            `;
            listaContenedor.appendChild(li);
        });

    } catch (err) {
        console.error("Error en proximos cobros:", err);
    }
}



// ------------------- FUNCIÓN 4: TOP CLIENTES -------------------
// ------------------- FUNCIÓN 4: TOP CLIENTES -------------------
async function cargarTopClientes() {
    try {
        const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado"));
        const userId = usuarioLogueado?.auth_user_id || usuarioLogueado?.id;

        if (!userId) return;

        // 1. Traemos los préstamos que NO están finalizados
        const { data: prestamos, error } = await supabaseClient
            .from('prestamos')
            .select(`
                monto_prestado,
                estado_prestamo,
                clientes (nombre, apellido)
            `)
            .eq('user_id', userId)
            .neq('estado_prestamo', 'finalizado');

        if (error) throw error;

        // 2. Agrupamos por cliente (por si un cliente tiene más de un préstamo activo)
        const acumuladoClientes = {};

        prestamos.forEach(p => {
            if (!p.clientes) return;
            const nombreCompleto = `${p.clientes.nombre} ${p.clientes.apellido}`;
            
            if (!acumuladoClientes[nombreCompleto]) {
                acumuladoClientes[nombreCompleto] = 0;
            }
            // Sumamos el monto prestado original
            acumuladoClientes[nombreCompleto] += Number(p.monto_prestado);
        });

        // 3. Convertimos a array, ordenamos de mayor a menor y tomamos el Top 5
        const topArray = Object.entries(acumuladoClientes)
            .map(([nombre, total]) => ({ nombre, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        // 4. Renderizamos en el HTML
        const listaContenedor = document.getElementById('lista-top-clientes');
        if (!listaContenedor) return;
        
        listaContenedor.innerHTML = "";

        topArray.forEach((item, index) => {
            // Generar iniciales
            const iniciales = item.nombre
                .split(' ')
                .filter(n => n.length > 0)
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);

            const li = document.createElement('li');
            li.className = 'top-item';
            li.innerHTML = `
                <div class="top-perfil">
                    <div class="top-avatar">${iniciales}</div>
                    <span class="top-nombre">${item.nombre}</span>
                </div>
                <span class="top-monto">${formatearMoneda(item.total)}</span>
            `;
            listaContenedor.appendChild(li);
        });

        if (topArray.length === 0) {
            listaContenedor.innerHTML = `<p style="color:gray; font-size:12px; text-align:center; padding: 20px;">No hay préstamos activos</p>`;
        }

    } catch (err) {
        console.error("Error en top clientes:", err.message);
    }
}





//----------------------------- HAMBURGUESAAAA ----------------------------
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    // Función para abrir/cerrar
    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        });

        // Cerrar al hacer clic en la capa oscura
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });

        // Opcional: Cerrar menú si se hace clic en un enlace (en móvil)
        const menuLinks = document.querySelectorAll('.menu-item');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 1024) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                }
            });
        });
    }
});



// ------------------- LÓGICA DE CAMBIO DE TEMA -------------------
// ------------------- LÓGICA DE CAMBIO DE TEMA -------------------
document.addEventListener('DOMContentLoaded', () => {
    const btnTema = document.getElementById('btn-tema');
    const temaIcon = document.getElementById('tema-icon');
    const body = document.body;

    // 1. Revisar si ya existe un tema guardado en localStorage
    const temaGuardado = localStorage.getItem('tema');
    if (temaGuardado === 'oscuro') {
        body.classList.add('tema-oscuro');
        actualizarIcono(true);
    }

    // 2. Evento click para cambiar el tema
    btnTema.addEventListener('click', () => {
        const esOscuro = body.classList.toggle('tema-oscuro');
        
        // Guardar preferencia
        localStorage.setItem('tema', esOscuro ? 'oscuro' : 'claro');
        
        // Actualizar icono
        actualizarIcono(esOscuro);

        // Opcional: Si el gráfico de Chart.js usa colores que cambian, 
        // podrías necesitar recargarlo aquí:
        cargarGraficoClientes(); 
    });

    function actualizarIcono(esOscuro) {
        if (esOscuro) {
            // Icono de Sol (para volver al claro)
            temaIcon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
        } else {
            // Icono de Luna (para volver al oscuro)
            temaIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
        }
    }
});




// ----------- Función para animar los números ------------------
// ----------- Función para animar los números ------------------
function animarValor(id, valorFinal, duracion = 1500) {
    const elemento = document.getElementById(id);
    let inicio = 0;
    const incremento = valorFinal / (duracion / 16); // 16ms es aprox 1 frame a 60fps

    const actualizar = () => {
        inicio += incremento;
        if (inicio < valorFinal) {
            // Formatear con puntos de miles mientras cuenta
            elemento.textContent = Math.floor(inicio).toLocaleString('es-AR', {
                style: 'currency',
                currency: 'ARS',
                maximumFractionDigits: 0
            });
            requestAnimationFrame(actualizar);
        } else {
            // Al terminar, poner el valor real exacto
            elemento.textContent = valorFinal.toLocaleString('es-AR', {
                style: 'currency',
                currency: 'ARS',
                maximumFractionDigits: 0
            });
        }
    };

    actualizar();
}


// Función para animar los números
function animarContador(id, valorFinal, duracion = 1500) {
    const elemento = document.getElementById(id);
    if (!elemento) return;

    let inicio = 0;
    const pasos = 60; // 60 frames por segundo
    const incremento = valorFinal / (duracion / (1000 / pasos));
    
    const formatoMoneda = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    const actualizar = () => {
        inicio += incremento;
        if (inicio < valorFinal) {
            elemento.textContent = formatoMoneda.format(Math.floor(inicio));
            requestAnimationFrame(actualizar);
        } else {
            elemento.textContent = formatoMoneda.format(valorFinal);
        }
    };

    actualizar();
}






document.addEventListener('DOMContentLoaded', () => {
    cargarResumenCapital();
    cargarGraficoClientes();
    cargarProximosCobros(); // <--- Agrega esta línea
    cargarTopClientes();
});