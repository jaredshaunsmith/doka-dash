import React, { useEffect, useState, useRef } from 'react'
import '../styles/styles.css'
import styles from './App.module.css'
import Loading from './views/Loading'
import Dashboard from './views/Dashboard'
import JMuxer from 'jmuxer'

const {ipcRenderer} = window;

function useInterval(callback, delay) {
    const savedCallback = useRef()
  
    // Remember the latest callback.
    useEffect(() => {
      savedCallback.current = callback;
    }, [callback])
  
    // Set up the interval.
    useEffect(() => {
      let id = setInterval(() => {
        savedCallback.current()
      }, delay)
      return () => clearInterval(id)
    }, [delay])
  }

const App = () => {
    const height = 480
    const width = 800

    const [loading, setLoading] = useState(true)
    const [mode, setMode] = useState('carplay')
    const [iphoneConnected, setIphoneConnected] = useState(false)
    const [eventCords, setEventCords] = useState({ x: 0, y: 0 })
    const [mouseDown, setMouseDown] = useState(false)
    const [reverse, setReverse] = useState('no reverse activity yet')

    useEffect(() => {
        const jmuxer = new JMuxer({
            node: 'player',
            mode: 'video',
            maxDelay: 10,
	        fps: 60,
            flushingTime: 1,
            debug: true
        })

        ipcRenderer?.on('plugged', () => {
            setIphoneConnected(true)
        })
        ipcRenderer?.on('unplugged', () => {
            setMode('dashboard')
            setIphoneConnected(false)
        })
        ipcRenderer?.send('statusReq')
        const ws = new WebSocket("ws://localhost:3001")
        ws.binaryType = 'arraybuffer'
        ws.onmessage = (event) => {
            let buf = Buffer.from(event.data)
            let duration = buf.readInt32BE(0)
            let video = buf.slice(4)
            jmuxer.feed({video: new Uint8Array(video), duration:duration})
        }

        ipcRenderer?.on('reverseSwitch', (event, data) => {
            setReverse(JSON.stringify(data))
        })

        setTimeout(() => {
            setLoading(false)
        }, 4000)
    }, [])

    // const handleMDown = (e) => {
    //     let currentTargetRect = e.target.getBoundingClientRect();
    //     let x = e.clientX - currentTargetRect.left
    //     let y = e.clientY - currentTargetRect.top
    //     x = x / width
    //     y = y / height
    //     setEventCords({ x, y })
    //     setMouseDown(true)
    //     ipcRenderer?.send('click', { type: 14, x, y })
    // }

    // const handleMUp = (e) => {
    //     let currentTargetRect = e.target.getBoundingClientRect();
    //     let x = e.clientX - currentTargetRect.left
    //     let y = e.clientY - currentTargetRect.top
    //     x = x / width
    //     y = y / height
    //     setMouseDown(false)
    //     ipcRenderer?.send('click', { type: 16, x, y })
    // }

    // const handleMMove = (e) => {
    //     let currentTargetRect = e.target.getBoundingClientRect();
    //     let x = e.clientX - currentTargetRect.left
    //     let y = e.clientY - currentTargetRect.top
    //     x = x / width
    //     y = y / height
    //     ipcRenderer?.send('click', { type: 15, x, y })
    // }

    const handleSingleTouch = (e) => {
        let currentTargetRect = e.target.getBoundingClientRect();
        let x = e.touches[0].clientX - currentTargetRect.left
        let y = e.touches[0].clientY - currentTargetRect.top
        x = x / width
        y = y / height
        setEventCords({ x, y })
        setMouseDown(true)
        if(mode==='carplay') {
            ipcRenderer?.send('click', { type: 14, x, y })
        }
    }

    const handleDown = (e) => {
        if(mode==='carplay') {
            e.preventDefault()
        }
        switch (e.touches.length) {
            case 1: handleSingleTouch(e); break;
            case 5: toggleCarplay(); break;
            default: console.log("Not supported"); break;
         }
    }

    const toggleCarplay = () => {
        if(iphoneConnected && mode !== 'carplay') {
            setMode('carplay')
        } else {
            setMode('dashboard')
        }
    }

    const handleUp = (e) => {
        if(mode==='carplay') {
            let x = eventCords.x
            let y = eventCords.y
            setMouseDown(false)
            ipcRenderer?.send('click', { type: 16, x, y })
            e.preventDefault()
        }
    }


    const handleMove = (e) => {
        let currentTargetRect = e.target.getBoundingClientRect();
        let x = e.touches[0].clientX - currentTargetRect.left
        let y = e.touches[0].clientY - currentTargetRect.top
        x = x / width
        y = y / height
        ipcRenderer?.send('click', { type: 15, x, y })
    }

    const [currMinutes, setCurrMinutes] = useState('00')
    const [currHours, setCurrHours] = useState('00')
    const [currSeconds, setCurrSeconds] = useState('00')

    const determineNewZero = (stringNum) => {
        if(parseInt(stringNum) + 1 === 60) {
            return '00'
        }
        return stringNum.startsWith('0') && parseInt(stringNum.split('').pop())+1 < 10 ? `0${parseInt(stringNum.split('').pop())+1}` : `${parseInt(stringNum)+1}`
    }

    useInterval(() => {
        setCurrSeconds(determineNewZero(currSeconds))
    }, 1000)

    useInterval(() => {
        setCurrHours(determineNewZero(currHours))
    }, 3600000)
    
    useInterval(() => {
        setCurrMinutes(determineNewZero(currMinutes))
    }, 60000)

    return (
        <div style={{height: '100%'}}>
            {loading && <Loading /> }
            <div
                className={styles.App}
                onTouchStart={handleDown}
                onTouchEnd={handleUp}
                onTouchMove={(e) => {
                    if (mouseDown) {
                        handleMove(e)
                    }
                }}
            >
                {mode === 'dashboard' && (
                    <>
                        <Dashboard times={{ currHours, currMinutes, currSeconds }} />
                    </>
                )}
                <div style={{color: 'white', zIndex: 99, position: 'fixed', top: 200, left: 50}}>{reverse}</div>
                <video
                    style={{display: iphoneConnected && mode === 'carplay' ? "block" : "none"}}
                    autoPlay
                    id="player"
                />
            </div>
        </div>
    )
}

export default App