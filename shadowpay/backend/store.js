// In-memory store — good enough for a hackathon demo

const employees = [
  {
    id: 1,
    name: "Alice Chen",
    role: "Senior Engineer",
    evmAddress: "0x1111111111111111111111111111111111111111",
    salary: "1",// Unlink token.
    // USDC per month, 6 decimals stored as human-readable
    unlinkIndex: 1,
    password: "alice123",
  },
  {
    id: 2,
    name: "Bob Martinez",
    role: "Product Manager",
    evmAddress: "0x2222222222222222222222222222222222222222",
    salary: "2",
    unlinkIndex: 2,
    password: "bob123",
  },
  {
    id: 3,
    name: "Carol Kim",
    role: "Designer",
    evmAddress: "0x3333333333333333333333333333333333333333",
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
