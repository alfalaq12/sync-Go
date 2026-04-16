package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct {
	db *pgxpool.Pool
}

func NewUserHandler(db *pgxpool.Pool) *UserHandler {
	return &UserHandler{db: db}
}

// ─── Users ───────────────────────────────────────────────────────────

type UserResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Branch    string `json:"branch"`
	Email     string `json:"email"`
	LastLogin string `json:"lastLogin"`
    Role      string `json:"role"`
}

func (h *UserHandler) ListUsers(c *gin.Context) {
	rows, err := h.db.Query(c.Request.Context(), "SELECT id, username, role, created_at FROM S_USERS")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	defer rows.Close()

	var users []UserResponse
	for rows.Next() {
		var id int
		var username, role string
		var createdAt interface{}
		
		if err := rows.Scan(&id, &username, &role, &createdAt); err == nil {
			users = append(users, UserResponse{
				ID:        username, 
				Name:      username,
                Role:      role,
				Branch:    "System HQ", 
				Email:     username + "@sync.go", 
				LastLogin: "Online", 
			})
		}
	}
	c.JSON(http.StatusOK, gin.H{"data": users, "total": len(users)})
}

func (h *UserHandler) CreateUser(c *gin.Context) {
    var req struct {
        Username string `json:"username" binding:"required"`
        Password string `json:"password" binding:"required"`
        Role     string `json:"role" binding:"required"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    _, err := h.db.Exec(c.Request.Context(), 
        "INSERT INTO S_USERS (username, password_hash, role) VALUES ($1, $2, $3)", 
        req.Username, string(hash), req.Role)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
        return
    }
    c.JSON(http.StatusCreated, gin.H{"message": "User created successfully"})
}

func (h *UserHandler) UpdateUser(c *gin.Context) {
    id := c.Param("id") // id here refers to username in this legacy-to-modern structure
    var req struct {
        Username string `json:"username"`
        Role     string `json:"role"`
        Password string `json:"password"` // optional update
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    if req.Password != "" {
        hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
        _, err := h.db.Exec(c.Request.Context(), 
            "UPDATE S_USERS SET username = $1, role = $2, password_hash = $3 WHERE username = $4", 
            req.Username, req.Role, string(hash), id)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user with password"})
            return
        }
    } else {
        _, err := h.db.Exec(c.Request.Context(), 
            "UPDATE S_USERS SET username = $1, role = $2 WHERE username = $3", 
            req.Username, req.Role, id)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
            return
        }
    }
    c.JSON(http.StatusOK, gin.H{"message": "User updated successfully"})
}

func (h *UserHandler) DeleteUser(c *gin.Context) {
    id := c.Param("id")
    _, err := h.db.Exec(c.Request.Context(), "DELETE FROM S_USERS WHERE username = $1", id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

// ─── Groups ──────────────────────────────────────────────────────────

func (h *UserHandler) ListGroups(c *gin.Context) {
	rows, err := h.db.Query(c.Request.Context(), "SELECT m_group_id, name, description FROM M_GROUPS")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch groups"})
		return
	}
	defer rows.Close()

	var groups []map[string]interface{}
	for rows.Next() {
		var id int
		var name, desc string
		if err := rows.Scan(&id, &name, &desc); err == nil {
			groups = append(groups, map[string]interface{}{
				"id":          id,
				"name":        name,
                "description": desc,
			})
		}
	}
	c.JSON(http.StatusOK, gin.H{"data": groups, "total": len(groups)})
}

func (h *UserHandler) CreateGroup(c *gin.Context) {
    var req struct {
        Name        string `json:"name" binding:"required"`
        Description string `json:"description"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    _, err := h.db.Exec(c.Request.Context(), "INSERT INTO M_GROUPS (name, description) VALUES ($1, $2)", req.Name, req.Description)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create group"})
        return
    }
    c.JSON(http.StatusCreated, gin.H{"message": "Group created successfully"})
}

func (h *UserHandler) UpdateGroup(c *gin.Context) {
    id := c.Param("id")
    var req struct {
        Name        string `json:"name"`
        Description string `json:"description"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    _, err := h.db.Exec(c.Request.Context(), "UPDATE M_GROUPS SET name = $1, description = $2 WHERE m_group_id = $3", req.Name, req.Description, id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update group"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Group updated successfully"})
}

func (h *UserHandler) DeleteGroup(c *gin.Context) {
    id := c.Param("id")
    _, err := h.db.Exec(c.Request.Context(), "DELETE FROM M_GROUPS WHERE m_group_id = $1", id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete group"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Group deleted successfully"})
}

// ─── Roles ───────────────────────────────────────────────────────────

func (h *UserHandler) ListRoles(c *gin.Context) {
	rows, err := h.db.Query(c.Request.Context(), "SELECT m_role_id, name, description FROM M_ROLES")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch roles"})
		return
	}
	defer rows.Close()

	var roles []map[string]interface{}
	for rows.Next() {
		var id int
		var name, desc string
		if err := rows.Scan(&id, &name, &desc); err == nil {
			roles = append(roles, map[string]interface{}{
				"id":          id,
				"name":        name,
                "description": desc,
			})
		}
	}
	c.JSON(http.StatusOK, gin.H{"data": roles, "total": len(roles)})
}

func (h *UserHandler) CreateRole(c *gin.Context) {
    var req struct {
        Name        string `json:"name" binding:"required"`
        Description string `json:"description"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    _, err := h.db.Exec(c.Request.Context(), "INSERT INTO M_ROLES (name, description) VALUES ($1, $2)", req.Name, req.Description)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create role"})
        return
    }
    c.JSON(http.StatusCreated, gin.H{"message": "Role created successfully"})
}

func (h *UserHandler) UpdateRole(c *gin.Context) {
    id := c.Param("id")
    var req struct {
        Name        string `json:"name"`
        Description string `json:"description"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    _, err := h.db.Exec(c.Request.Context(), "UPDATE M_ROLES SET name = $1, description = $2 WHERE m_role_id = $3", req.Name, req.Description, id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Role updated successfully"})
}

func (h *UserHandler) DeleteRole(c *gin.Context) {
    id := c.Param("id")
    _, err := h.db.Exec(c.Request.Context(), "DELETE FROM M_ROLES WHERE m_role_id = $1", id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete role"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Role deleted successfully"})
}

// ─── Policies ────────────────────────────────────────────────────────

func (h *UserHandler) ListPolicies(c *gin.Context) {
	rows, err := h.db.Query(c.Request.Context(), "SELECT m_policy_id, name, policy_type, description FROM M_POLICIES")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch policies"})
		return
	}
	defer rows.Close()

	var policies []map[string]interface{}
	for rows.Next() {
		var id int
		var name, pType, desc string
		if err := rows.Scan(&id, &name, &pType, &desc); err == nil {
			policies = append(policies, map[string]interface{}{
				"id":          id,
				"name":        name,
                "policy_type": pType,
                "description": desc,
			})
		}
	}
	c.JSON(http.StatusOK, gin.H{"data": policies, "total": len(policies)})
}

func (h *UserHandler) CreatePolicy(c *gin.Context) {
    var req struct {
        Name        string `json:"name" binding:"required"`
        Type        string `json:"policy_type"`
        Content     string `json:"content"`
        Description string `json:"description"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    _, err := h.db.Exec(c.Request.Context(), "INSERT INTO M_POLICIES (name, policy_type, content, description) VALUES ($1, $2, $3, $4)", req.Name, req.Type, req.Content, req.Description)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create policy"})
        return
    }
    c.JSON(http.StatusCreated, gin.H{"message": "Policy created successfully"})
}

func (h *UserHandler) UpdatePolicy(c *gin.Context) {
    id := c.Param("id")
    var req struct {
        Name        string `json:"name"`
        Type        string `json:"policy_type"`
        Content     string `json:"content"`
        Description string `json:"description"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    _, err := h.db.Exec(c.Request.Context(), "UPDATE M_POLICIES SET name = $1, policy_type = $2, content = $3, description = $4 WHERE m_policy_id = $5", req.Name, req.Type, req.Content, req.Description, id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update policy"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Policy updated successfully"})
}

func (h *UserHandler) DeletePolicy(c *gin.Context) {
    id := c.Param("id")
    _, err := h.db.Exec(c.Request.Context(), "DELETE FROM M_POLICIES WHERE m_policy_id = $1", id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete policy"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Policy deleted successfully"})
}
