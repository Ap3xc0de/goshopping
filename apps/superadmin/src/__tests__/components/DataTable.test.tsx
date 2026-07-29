import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from '@/components/ui/DataTable';

const columns = [
  { key: 'id',   header: 'ID' },
  { key: 'name', header: 'Nombre' },
];

const data = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
];

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Nombre')).toBeInTheDocument();
  });

  it('renders row data', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders empty message when no data', () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="Sin datos" />);
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
  });

  it('calls onRowClick when a row is clicked', async () => {
    const onRowClick = jest.fn();
    render(<DataTable columns={columns} data={data} onRowClick={onRowClick} />);
    await userEvent.click(screen.getByText('Alice'));
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('uses custom render function when provided', () => {
    const cols = [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Nombre', render: (row: { id: string; name: string }) => <strong>{row.name.toUpperCase()}</strong> },
    ];
    render(<DataTable columns={cols} data={data} />);
    expect(screen.getByText('ALICE')).toBeInTheDocument();
  });
});
