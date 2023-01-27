import { createSlice } from '@reduxjs/toolkit';

export const userSlice = createSlice({
  name: 'user',
  initialState: {
    name: (() => {
      const username = !!document.cookie ? document.cookie
      .split(';')
      .map(v => v.split('='))
      .reduce((acc, v) => {
        acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
        return acc;
      }, {})?.username : "";

      return !!username ? username : "";
    })()
  },
  reducers: {
    set: (state, action) => { state.name = action.payload }
  }
})

export const { set } = userSlice.actions

export default userSlice.reducer
