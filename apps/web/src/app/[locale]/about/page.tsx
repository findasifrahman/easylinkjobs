import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function AboutPage() {
  return (
    <Container sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={2}>
        <Typography variant="h2">About</Typography>
        <Typography color="text.secondary">
          easylinkjobs focuses on foreigner-friendly hiring in China with structured job data, verification, and clean application flows.
        </Typography>
      </Stack>
    </Container>
  );
}
