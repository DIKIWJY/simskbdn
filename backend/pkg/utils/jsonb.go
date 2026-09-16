package utils

import (
    "database/sql/driver"
    "encoding/json"
    "errors"
)

// JSONB → custom type agar GORM bisa simpan map ke kolom JSONB PostgreSQL
type JSONB map[string]interface{}

func (j JSONB) Value() (driver.Value, error) {
    if j == nil {
        return "{}", nil
    }
    b, err := json.Marshal(j)
    return string(b), err
}

func (j *JSONB) Scan(value interface{}) error {
    if value == nil {
        *j = make(JSONB)
        return nil
    }
    var bytes []byte
    switch v := value.(type) {
    case []byte:
        bytes = v
    case string:
        bytes = []byte(v)
    default:
        return errors.New("tipe tidak didukung untuk JSONB")
    }
    return json.Unmarshal(bytes, j)
}