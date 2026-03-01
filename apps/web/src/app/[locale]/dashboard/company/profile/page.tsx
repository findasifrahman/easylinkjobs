import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { CompanyProfileEditor } from "@/components/company/CompanyProfileEditor";

export default function CompanyProfilePage() {
  return (
    <Stack spacing={2.5}>
      <Typography variant="h3">Edit company profile</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 820 }}>
        Keep your employer identity, recruiter contact details, and company profile current before publishing more roles.
      </Typography>
      <CompanyProfileEditor />
    </Stack>
  );
}
