import * as React from "react";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { styled, lighten, darken } from "@mui/system";

const GroupHeader = styled("div")({
  position: "sticky",
  top: "-8px",
  padding: "4px 10px",
  color: "#1976d2", // MUIデフォルトprimary
  backgroundColor: "#e3f2fd", // MUIデフォルトprimary.light
  fontWeight: 700,
});

const GroupItems = styled("ul")({
  padding: 0,
});

import type { Problem } from "./FlowchartPhysics";

interface ProblemSearchAutocompleteProps {
  options: Problem[];
  onSelect: (problem: Problem) => void;
}

export default function ProblemSearchAutocomplete({
  options,
  onSelect,
}: ProblemSearchAutocompleteProps) {
  return (
    <Autocomplete
      options={options}
      groupBy={(option: Problem) => `P.${option.page}`}
      getOptionLabel={(option: Problem) =>
        `${option.ProblemNumber}（P.${option.page}）`
      }
      sx={{ width: 320 }}
      renderInput={(params) => (
        <TextField {...params} label="問題を検索" size="small" />
      )}
      renderGroup={(params) => (
        <li key={params.key}>
          <GroupHeader>{params.group}</GroupHeader>
          <GroupItems>{params.children}</GroupItems>
        </li>
      )}
      onChange={(_, value) => value && onSelect(value as Problem)}
      isOptionEqualToValue={(option, value) =>
        (option as Problem).id === (value as Problem).id
      }
    />
  );
}
