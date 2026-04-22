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
                cutout: '70%',
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
let todosLosCobros = []; // Variable global para guardar los datos

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

        // 1. Mapear y calcular datos
        todosLosCobros = prestamos.map(p => {
            const cuotaSiguiente = (p.cuotas_pagadas || 0) + 1;
            const intervalo = p.intervalo_pago || 1;
            const frecuencia = (p.frecuencia_pago || "diario").toLowerCase();
            
            let fechaVencimiento = new Date(p.fecha_inicio);
            fechaVencimiento.setMinutes(fechaVencimiento.getMinutes() + fechaVencimiento.getTimezoneOffset());

            if (frecuencia.includes("diario")) {
                fechaVencimiento.setDate(fechaVencimiento.getDate() + (cuotaSiguiente * intervalo));
            } else if (frecuencia.includes("semanal")) {
                fechaVencimiento.setDate(fechaVencimiento.getDate() + (cuotaSiguiente * intervalo * 7));
            } else if (frecuencia.includes("mensual")) {
                fechaVencimiento.setMonth(fechaVencimiento.getMonth() + (cuotaSiguiente * intervalo));
            }

            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            fechaVencimiento.setHours(0, 0, 0, 0);

            const diffTiempo = fechaVencimiento - hoy;
            const diffDias = Math.round(diffTiempo / (1000 * 60 * 60 * 24));

            return {
                nombre: `${p.clientes.nombre} ${p.clientes.apellido}`,
                monto: Math.round(p.valor_cuota), // Redondeo aplicado
                diasFaltantes: diffDias,
                estadoOriginal: p.estado_prestamo
            };
        });

        // 2. Ordenar
        todosLosCobros.sort((a, b) => a.diasFaltantes - b.diasFaltantes);



         let estaExpandido = false; // Estado del botón
        // Iconos SVG
        const iconoAbajo = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
        const iconoArriba = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;

        // 3. Renderizar los primeros 5 inicialmente
        renderizarListaCobros(todosLosCobros.slice(0, 5));

        // 4. Configurar el botón "Ver todos"
        const btnVerTodos = document.getElementById('btn-ver-todos-cobros');
        if (btnVerTodos) {
            // Solo mostramos el botón si hay más de 5 elementos
            if (todosLosCobros.length > 5) {
                btnVerTodos.style.display = 'flex';
                btnVerTodos.innerHTML = `Ver todos ${iconoAbajo}`;
                
                btnVerTodos.onclick = () => {
                    estaExpandido = !estaExpandido; // Cambiamos el estado
                    
                    if (estaExpandido) {
                        renderizarListaCobros(todosLosCobros);
                        btnVerTodos.innerHTML = `Ver menos ${iconoArriba}`;
                    } else {
                        renderizarListaCobros(todosLosCobros.slice(0, 5));
                        btnVerTodos.innerHTML = `Ver todos ${iconoAbajo}`;
                    }
                };
            } else {
                btnVerTodos.style.display = 'none';
            }
        }      
                          
    } catch (err) {
        console.error("Error en proximos cobros:", err);
    }
}


// Nueva función auxiliar para renderizar
function renderizarListaCobros(lista) {
    const listaContenedor = document.getElementById('lista-cobros');
    listaContenedor.innerHTML = "";

    lista.forEach(c => {
        let textoFecha = "";
        let esUrgente = false;
        let esAlerta = false;
        let esNormal = false;

        if (c.diasFaltantes < 0 || c.estadoOriginal.toLowerCase().includes("atrasado")) {
            textoFecha = "Vencido";
            esUrgente = true;
        } else if (c.diasFaltantes === 0) {
            textoFecha = "Vence hoy";
            esAlerta = true;
        } else if (c.diasFaltantes === 1) {
            textoFecha = "Vence mañana";
            esAlerta = true;
        } else {
            textoFecha = `Vence en ${c.diasFaltantes} días`;
            esNormal = true;
        }

        const iconoReloj = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
        const iconoCalendario = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

        const li = document.createElement('li');
        li.className = `cobro-item ${esUrgente ? 'cobro-item--urgente' : ''} ${esAlerta ? 'cobro-item--alerta' : ''} ${esNormal ? 'cobro-item--normal' : ''}`;
        
        li.innerHTML = `
            <div class="cobro-info">
                <span class="cobro-nombre">${c.nombre}</span>
                <span class="cobro-fecha ${esUrgente ? 'cobro-fecha--urgente' : ''} ${esAlerta ? 'cobro-fecha--alerta' : ''} ${esNormal ? 'cobro-fecha--normal' : ''}">
                    ${(esUrgente || esAlerta) ? iconoReloj : ''} 
                    ${esNormal ? iconoCalendario : ''} 
                    ${textoFecha}
                </span>
            </div>
            <span class="cobro-monto ${esUrgente ? 'cobro-monto--urgente' : ''} ${esAlerta ? 'cobro-monto--alerta' : ''} ${esNormal ? 'cobro-monto--normal' : ''}">
                ${formatearMoneda(c.monto)}
            </span>
        `;
        listaContenedor.appendChild(li);
    });
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
                    <div class="top-detalles">
                        <span class="top-nombre">${item.nombre}</span>
                        <span class="top-rank">#${index + 1}</span>
                    </div>
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