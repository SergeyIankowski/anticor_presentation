import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

export interface ToggleOption<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface Props<T extends string | number> {
  label: string;
  /** Show `label` as a caption above the buttons; otherwise it only names the group. */
  caption?: boolean;
  value: T;
  options: ToggleOption<T>[];
  onChange: (value: T) => void;
}

// Exactly one option is active: clicking the active button keeps it instead of clearing it.
export default function ToggleSwitch<T extends string | number>({
  label,
  caption = false,
  value,
  options,
  onChange,
}: Props<T>) {
  const group = (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      onChange={(_, next: T | null) => next != null && onChange(next)}
      aria-label={label}
    >
      {options.map((option) => (
        <ToggleButton key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
  if (!caption) return group;
  return (
    <Stack sx={{ gap: 0.5 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      {group}
    </Stack>
  );
}
