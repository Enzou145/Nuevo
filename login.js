// CONFIGURACIÓN DE TU PROYECTO
const SUPABASE_URL = "https://ljsnvsvlnazprcfhoytc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ELqT_WM7MrJonyYE6L6P1Q_kmAPw3bB";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ELEMENTOS DEL DOM
const formLogin = document.getElementById("formLogin");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const mensajeLogin = document.getElementById("mensajeLogin");
const btnLogin = document.getElementById("btnLogin");

function mostrarMensaje(texto, esError = true) {
    mensajeLogin.textContent = texto;
    mensajeLogin.style.color = esError ? "#ef4444" : "#22c55e";
    mensajeLogin.style.display = "block";
}

// Obtener los datos del perfil del prestamista
async function obtenerPerfilUsuario(authUserId) {
    const { data, error } = await supabaseClient
        .from("usuarios")
        .select("*")
        .eq("auth_user_id", authUserId)
        .single();

    if (error) {
        console.error("Error buscando perfil:", error);
        return null;
    }
    return data;
}

// Verificar sesión al cargar
async function verificarSesionActiva() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        const perfil = await obtenerPerfilUsuario(session.user.id);
        if (perfil) {
            localStorage.setItem("usuarioLogueado", JSON.stringify(perfil));
            window.location.href = "clientesyprestamos.html"; // Cambia esto al nombre de tu archivo principal
        }
    }
}

// Evento de Login
formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    btnLogin.disabled = true;
    btnLogin.textContent = "Ingresando...";
    mostrarMensaje("");

    // 1. Login en Supabase Auth
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        mostrarMensaje("Correo o contraseña incorrectos.");
        btnLogin.disabled = false;
        btnLogin.textContent = "Ingresar";
        return;
    }

    // 2. Buscamos su perfil para tener sus datos a mano (nombre, id, etc)
    const perfil = await obtenerPerfilUsuario(data.user.id);

    if (!perfil) {
        // Si no tiene perfil en la tabla 'usuarios', lo sacamos
        await supabaseClient.auth.signOut();
        mostrarMensaje("No tienes permisos de administrador.");
        btnLogin.disabled = false;
        btnLogin.textContent = "Ingresar";
        return;
    }

    // 3. Éxito: Guardamos en LocalStorage y entramos
    localStorage.setItem("usuarioLogueado", JSON.stringify(perfil));
    window.location.href = "clientesyprestamos.html"; 
});

document.addEventListener("DOMContentLoaded", verificarSesionActiva);