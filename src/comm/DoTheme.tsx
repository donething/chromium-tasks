import {createTheme} from "@mui/material"

// 默认主题
export const defaultTheme = createTheme()

// 自定义主题
const DoTheme = createTheme({
  palette: {
    background: {
      default: "#F8F8F5"
    }
  },

  typography: {
    button: {
      textTransform: "none",
      minWidth: 0
    }
  },

  components: {
    MuiButton: {
      defaultProps: {}
    },

    MuiCardContent: {
      defaultProps: {
        style: {
          display: "flex",
          flexFlow: "column nowrap",
          gap: defaultTheme.spacing(2)
        }
      }
    },

    MuiCardActions: {
      defaultProps: {
        style: {
          justifyContent: "space-between"
        }
      }
    }
  }
})

export default DoTheme