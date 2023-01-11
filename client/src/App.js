import React, { useState, useEffect } from 'react';
import Toggle from 'react-toggle'

import Container from './components/Container';
import ScoreBoard from './components/ScoreBoard';
import Game from './components/Game';

import initializeGame from './movements/initializeGame';
import move from './movements/move';
import { mapKeyCodeToDirection } from './constants/directions';
import GameDisplay from './constants/GameDisplay';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import styled, { ThemeProvider } from 'styled-components';


function App() {
  const [cells, setCells] = useState(initializeGame(4))
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [humanBestScore, setHumanBestScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [totalRewards, setTotalRewards] = useState([])
 
  const [startAI, setStartAI] = useState(false)
  const [humanMode, setHumanMode] = useState(false)
  const [resetAI, setResetAI] = useState(false)
  const [currentTrial, setCurrentTrial] = useState(1)

  const [createGame, setCreateGame] = useState(false)
  
  const [rewardsData, setRewardsData] = useState([{}])

  const handleKeyPress = (event) => {
    if (humanMode && !startAI && !gameOver && mapKeyCodeToDirection[event.code]) {
      let data = move(cells, mapKeyCodeToDirection[event.code])
      setCells([...data['grid']])
      if(humanMode && score >= humanBestScore) {
        setHumanBestScore(score + data['score'])
      }
      setScore(score + data['score'])
      setGameOver(data['gameOver'])
    }
  }

  const switchResetAI = async () => {
    if(!humanMode) {
      setResetAI(true)
    }
  }

  const newGame = async () => {
    setCreateGame(true)
    setGameOver(false)
  };

  const startAIGame = async () => {
    if(!humanMode) {
      if (startAI) {
        setStartAI(false)
      } else {
        setStartAI(true)
      }
    }
  }

  useEffect(() => {
    if(resetAI) {
      fetch("/restart").then(
        res => res.json()
      ).then(
        data => {
          setCells(data['board'])
          setResetAI(false) 
          setStartAI(false)
          setTotalRewards([])
          setRewardsData([{}])
          setScore(0)
        }
      )
    }
    if(createGame && humanMode) {
      fetch("/newgame").then(
        res => res.json()
      ).then(
        data => {
          setCells(data['board'])
          setCreateGame(false)
          setScore(0)
        }
      )
    }
    if(startAI) {
      fetch("/data").then(
        res => res.json()
      ).then(
        data => {
          setCells(data['board'])
          setCurrentTrial(data['trial'])
          if(data['score'] >= bestScore) {
            setBestScore(data['score'])
          }
          setScore(data['score'])
          if(data['complete']) {
            setTotalRewards([...totalRewards, score])
          }
        }
      )
    }
  });

  useEffect(() => {
    if(totalRewards[totalRewards.length - 1] === 0) {
      totalRewards.pop()
    }
    else {
      let sum = totalRewards[totalRewards.length - 1]
      let episode = currentTrial
      if(sum && rewardsData[totalRewards.length - 1]['epsiodeCount'] !== episode) {
        setRewardsData([...rewardsData, {episodeCount: episode, reward: sum}])
      }
    }
  }, [totalRewards])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  })

  const handleToggleHuman = () => {
    if(!startAI) {
      if(humanMode) {
        setHumanMode(false)
      }
      else {
        setHumanMode(true)
      }
      setResetAI(true)
    }
  }

  function activateHumanColorStyle(restart=false) {
    let backgroundColor = ""
    if(humanMode) {
      backgroundColor = "#90EE90"
    } else if(!restart) {
      backgroundColor = "#92B7FE"
    }
    return backgroundColor
  }

  function activateHumanText() {
    let text = ""
    if(humanMode) {
      text = "Human Mode"
    } else {
      text = "DQN AI mode"
    }
    return text
  }

  function activateAIColorStyle(reset=false) {
    let backgroundColor = ""
    if(!humanMode) {
      if(reset) {
        backgroundColor = "#90EE90"
      } else if(startAI) {
        backgroundColor = "#FF7F7F"
      } else {
        backgroundColor = "#90EE90"
      }
    }
    return backgroundColor
  }

  function activateAIText() {
    let text = ""
    if(startAI) {
      text = "Stop"
    } else {
      text = "Start"
    }
    return text
  }


  
  return (
    <div>
      <ThemeProvider theme={GameDisplay}>
        <Container>
          {console.log(totalRewards)}
          <div style={{flex: 1, padding: '10px', flexDirection: 'column'}}>
            <ScoreBoard score={score} bestScore={bestScore} humanBest={humanBestScore}/>
            <div style={{display: 'flex', marginTop: '10px', justifyContent: 'center'}}>
              <SettingsButton style={{backgroundColor: activateHumanColorStyle()}} onClick={handleToggleHuman}>
                  <Text>{activateHumanText()}</Text>
              </SettingsButton>
            </div>
            <br />
            <Game cells={cells} size={4} />
            <br />
            <div style={{display: 'flex', justifyContent: 'space-around'}}>
              <SettingsButton style={{backgroundColor: activateHumanColorStyle(true)}} onClick={newGame}>
                <Text>Restart Game</Text>
              </SettingsButton>
            </div>
            <br />
            <div style={{display: 'flex', justifyContent: 'space-around'}}>
              <BiggerText>DQN AI Settings</BiggerText>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-around'}}>
              <SettingsButton style={{backgroundColor: activateAIColorStyle(true)}} onClick={switchResetAI}>
                <Text>Reset AI</Text>
              </SettingsButton>
              <SettingsButton style={{backgroundColor: activateAIColorStyle()}} onClick={startAIGame}>
                <Text>{activateAIText()}</Text>
              </SettingsButton>
            </div>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-around'}}>
            <BiggerText>Rewards Chart</BiggerText>
          </div>
          <ResponsiveContainer width="100%" aspect={3}>
            <LineChart
              width={450}
              height={200}
              data={rewardsData}
              margin={{
                top: 5,
                right: 40,
                left: -10,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="episodeCount" />
              <YAxis datakey="reward"/>
              <Tooltip />
              <Line type="monotone" dataKey="reward" stroke="#8884d8" />
            </LineChart>  
          </ResponsiveContainer>
        </Container>
      </ThemeProvider>
    </div>
  )
}

export default App


const SettingsButton = styled.button`
  min-width: 100px;
  text-align: center;
  justify-content: center;
  background-color: ${props => props.theme.primaryColor};
  padding: 5px;
  text-transform: capitalize;
  outline: none;
  border: none;
  cursor: pointer;
  border-radius: 5px;
`;

const Text = styled.div`
  color: ${props => props.theme.labelColor};
  font-weight: bold;
  font-size: 15px;
  padding: 5px;
`;

const BiggerText = styled.div`
  color: ${props => props.theme.labelColor};
  font-weight: bold;
  font-size: 25px;
  justify-content: center;
  margin: 0 auto;
  padding: 5px;
`;


// class App extends Component {
//   state = {
//     cells: initializeGame(4),
//     score: 0,
//     bestScore: 0,
//     size: 4,
//     selectedTheme: 'light',
//     gameOver: false,
//   };

//   componentDidMount() {
//     document.addEventListener('keydown', this.handleKeyPress);
//   }

//   componentWillUnmount() {
//     document.removeEventListener('keydown', this.handleKeyPress);
//   }

//   newGame = () => {
//     this.setState(state => ({
//       ...state,
//       cells: initializeGame(state.size),
//       score: 0,
//       gameOver: false,
//     }));
//   };

//   handleKeyPress = event => {
//     const { gameOver } = this.state;
//     if (!gameOver && mapKeyCodeToDirection[event.code]) {
//       const { cells, score, bestScore, gameOver } = move(
//         this.state.cells,
//         mapKeyCodeToDirection[event.code],
//       );
//       this.setState({
//         cells,
//         score,
//         bestScore,
//         gameOver,
//       });
//     }
//   };

//   changeTheme = () => {
//     this.setState(state => ({
//       ...state,
//       selectedTheme: state.selectedTheme === 'light' ? 'light' : 'light',
//     }));
//   };

//   render() {
//     const { cells, score, bestScore, size, selectedTheme, gameOver } = this.state;
//     return (
//       <ThemeProvider theme={light}>
//         <Container>
//           <Wrapper>
//             <ScoreBoard score={score} bestScore={bestScore} />
//             <GameSettings
//               selectedTheme={selectedTheme}
//               changeTheme={this.changeTheme}
//               newGame={this.newGame}
//             />
//           </Wrapper>
//           <Wrapper>
//             {gameOver && <GameOver />}
//             <Game cells={cells} size={size} />
//           </Wrapper>
//         </Container>
//       </ThemeProvider>
//     );
//   }
// }

// const Wrapper = styled.div`
//   flex: 1;
//   padding: 10px;
//   flex-direction: column;
// `;

// export default App;























// import React, { useState, useEffect } from 'react'
// import Slot from "./components/Slot"
// import { Button, Label } from "semantic-ui-react"


// function App() {
//   const [board, setBoard] = useState([
//     [0, 0, 0, 0],
//     [0, 0, 0, 0],
//     [0, 0, 0, 0],
//     [0, 0, 0, 0]
//   ])
//   const [complete, setComplete] = useState(false)
//   const [start, setStart] = useState(false)
//   const [restart, setRestart] = useState(false)
//   const [text, setText] = useState("Ready")

//   useEffect(() => {
//     if(start) {
//       setText("Running")
//       fetch("/data").then(
//         res => res.json()
//       ).then(
//         data => {
//           setBoard(data['board'])
//           setComplete(data['complete'])
//         }
//       )
//     }
//     else if(restart) {
//       setText("Restarting")
//     }
//     else if(!start) {
//       setText("Ready")
//     }
//   })

//   const handleStart = () => {
//     if(start) {
//       setStart(false)
//     } else {
//       setStart(true)
//     }
//   }

//   return (
//     <div
//       style={{
//         background: "#AD9D8F",
//         width: "max-content",
//         margin: "auto",
//         padding: 5,
//         borderRadius: 5,
//         marginTop: 10,
//       }}
//     >
//       {board.map((row, index) => {
//         return (
//           <div style={{ display: 'flex'}} key={index}>
//               {row.map((digit, id) => (
//                 <Slot value={digit} key={id} />
//               ))}
//           </div>
//         )
//       })}
//       {console.log('done')}
//       <Button
//         onClick={async () => {
//           setRestart(true)
//           await fetch("/restart")
//           setTimeout(() => {
//             setBoard([
//               [0, 0, 0, 0],
//               [0, 0, 0, 0],
//               [0, 0, 0, 0],
//               [0, 0, 0, 0]
//             ])
//             setRestart(false)
//           }, 500)
//         }}>
//         Restart AI
//       </Button>
//       <Button
//         onClick={handleStart}>
//         Start/Stop
//       </Button>
//       <Label>
//         {text}
//       </Label>
//     </div>
//   )
// }

// export default App