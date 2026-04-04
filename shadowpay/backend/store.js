// In-memory store — good enough for a hackathon demo

const employees = [
  {
    id: 1,
    name: "Alice Chen",
    role: "Senior Engineer",
    evmAddress: "0x05ffD2C103d57Bcef49596DF6BEE1C30a2e6D88c",
    salary: "1", // Unlink token per month
    unlinkIndex: 1,
    password: "alice123",
  },
  {
    id: 2,
    name: "Bob Martinez",
    role: "Product Manager",
    evmAddress: "0x4E2DA149d54B59d6A6bA8D2Da82bf322edC89C63",
    salary: "2",
    unlinkIndex: 2,
    password: "bob123",
  },
  {
    id: 3,
    name: "Carol Kim",
    role: "Designer",
    evmAddress: "0xE3393702F7C2762775ed913Db2f87E34D778D30B",
    salary: "3",
    unlinkIndex: 3,
    password: "carol123",
  },
];

let nextEmployeeId = 4;

const payrollRuns = [];

export function getEmployees() {
  return employees;
}

export function getEmployee(id) {
  return employees.find((e) => e.id === id) ?? null;
}

export function getEmployeeByPassword(password) {
  return employees.find((e) => e.password === password) ?? null;
}

export function addEmployee(data) {
  const employee = {
    id: nextEmployeeId++,
    name: data.name,
    role: data.role,
    evmAddress: data.evmAddress,
    salary: data.salary,
    unlinkIndex: nextEmployeeId - 1, // same as id for simplicity
    password: data.password,
  };
  employees.push(employee);
  return employee;
}

export function getPayrollRuns() {
  return payrollRuns;
}

export function addPayrollRun(run) {
  payrollRuns.unshift(run);
  return run;
}
