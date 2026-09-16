package utils

import "github.com/gin-gonic/gin"

type APIResponse struct {
    Success bool        `json:"success"`
    Message string      `json:"message"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
}

func SuccessResponse(c *gin.Context, code int, message string, data interface{}) {
    c.JSON(code, APIResponse{
        Success: true,
        Message: message,
        Data:    data,
    })
}

func ErrorResponse(c *gin.Context, code int, message string, err string) {
    c.JSON(code, APIResponse{
        Success: false,
        Message: message,
        Error:   err,
    })
}