package drivers

import (
	"fmt"
)

var driverRegistry = make(map[string]Driver)

func init() {
	RegisterDriver("postgresql", &PostgresDriver{})
	RegisterDriver("mysql", &MySQLDriver{})
	RegisterDriver("csv", &CSVDriver{})
	// Future drivers: oracle, ftp, sftp, api
}

func RegisterDriver(name string, driver Driver) {
	driverRegistry[name] = driver
}

func GetDriver(name string) (Driver, error) {
	d, ok := driverRegistry[name]
	if !ok {
		return nil, fmt.Errorf("driver '%s' not implemented or registered", name)
	}
	return d, nil
}
