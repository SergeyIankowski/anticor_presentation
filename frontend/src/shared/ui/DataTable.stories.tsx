import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import type { Meta, StoryObj } from '@storybook/react-vite';
import DataTable from './DataTable.tsx';

const rows = [
  { name: 'Полная антикоррозийная обработка', price: '550 BYN' },
  { name: 'Антикор днища', price: 'от 200 BYN' },
];

const meta = {
  component: DataTable,
  args: {
    label: 'Пример таблицы',
    columns: [{ label: 'Услуга' }, { label: 'Цена', align: 'right' }],
    children: rows.map((row) => (
      <TableRow key={row.name} hover>
        <TableCell>{row.name}</TableCell>
        <TableCell align="right" className="num">
          {row.price}
        </TableCell>
      </TableRow>
    )),
  },
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithRows: Story = {};

export const Empty: Story = {
  args: { children: null, empty: 'Нет услуг для выбранного фильтра.' },
};
