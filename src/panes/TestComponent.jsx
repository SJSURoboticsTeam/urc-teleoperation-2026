import { Card, CardMedia } from '@mui/material'
import Box from '@mui/material/Box'

export default function TestComponent ({ style }) {
  return (
    <Box
      sx={{ width: 1, height: 1, position: 'relative' }}
      style={style}
    >
      <Card sx={{ maxWidth: 500 }}>
        <CardMedia
          component='img'
          src='https://www.sjsurobotics.org/assets/img/gallery/current-team.jpeg'
        />
      </Card>
    </Box>
  )
}