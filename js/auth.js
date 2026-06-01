/**
 * Math By Anoop - Authentication & Session Helper
 */

const auth = {
  // Store session variables
  saveSession(sessionData) {
    localStorage.setItem("session_token", sessionData.token);
    localStorage.setItem("session_user_type", sessionData.userType);
    localStorage.setItem("session_user_id", sessionData.userId);
    localStorage.setItem("session_user_name", sessionData.name);
  },

  // Clear local session storage
  clearSession() {
    localStorage.removeItem("session_token");
    localStorage.removeItem("session_user_type");
    localStorage.removeItem("session_user_id");
    localStorage.removeItem("session_user_name");
  },

  // Get active session details
  getSession() {
    return {
      token: localStorage.getItem("session_token"),
      userType: localStorage.getItem("session_user_type"),
      userId: localStorage.getItem("session_user_id"),
      name: localStorage.getItem("session_user_name")
    };
  },

  // Check login credentials
  async login(email, password) {
    try {
      const data = await api.post("login", { email, password });
      this.saveSession(data);
      
      // Redirect based on role
      if (data.userType === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "student.html";
      }
      return true;
    } catch (err) {
      // API handler already handles toast notices
      return false;
    }
  },

  // Terminate session
  async logout() {
    const session = this.getSession();
    if (session.token) {
      try {
        await api.post("logout", { token: session.token }, true);
      } catch (e) {
        console.warn("Server logout request failed:", e);
      }
    }
    this.clearSession();
    window.location.href = "index.html";
  },

  // Session guard for page security
  async checkSession(allowedRoles = []) {
    const session = this.getSession();
    
    // 1. Client side check
    if (!session.token || !session.userType) {
      this.clearSession();
      window.location.href = "index.html";
      return null;
    }

    // 2. Server validation
    try {
      const data = await api.get("validateToken", { token: session.token });
      if (!data.valid) {
        throw new Error("Expired session");
      }
      
      // Update name locally in case it changed
      localStorage.setItem("session_user_name", data.name);
      
      // 3. Role authorization check
      if (allowedRoles.length > 0 && !allowedRoles.includes(data.userType)) {
        throw new Error("Unauthorized access");
      }
      
      return { ...session, name: data.name };
    } catch (err) {
      console.warn("Session check failed, logging out:", err.message);
      this.clearSession();
      window.location.href = "index.html";
      return null;
    }
  }
};
