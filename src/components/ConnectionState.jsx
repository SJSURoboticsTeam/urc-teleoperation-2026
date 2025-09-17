import React, { useState } from "react";
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import TextField from '@mui/material/TextField';
import { Typography } from "@mui/material";
export function ConnectionState({ isConnected }) {
    return (
        <p>State: { '' + isConnected }</p>
    )
}