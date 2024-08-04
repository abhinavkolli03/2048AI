import React, { useState, useEffect } from 'react';
import "./App.css"

import Container from './components/Container';
import ScoreBoard from './components/ScoreBoard';
import Game from './components/Game';

import initializeGame from './movements/initializeGame';
import move from './movements/move';
import { mapKeyCodeToDirection } from './constants/directions';
import GameDisplay from './constants/GameDisplay';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import styled, { ThemeProvider } from 'styled-components';

function App() {
  const [cells, setCells] = useState(initializeGame(4));
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [humanBestScore, setHumanBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [totalRewards, setTotalRewards] = useState([]);
  const [startAI, setStartAI] = useState(false);
  const [humanMode, setHumanMode] = useState(false);
  const [resetAI, setResetAI] = useState(false);
  const [currentTrial, setCurrentTrial] = useState(1);
  const [createGame, setCreateGame] = useState(false);
  const [rewardsData, setRewardsData] = useState([{}]);
  const [ddqnMode, setDdqnMode] = useState(false);

  const handleKeyPress = (event) => {
    if (humanMode && !startAI && !gameOver && mapKeyCodeToDirection[event.code]) {
      let data = move(cells, mapKeyCodeToDirection[event.code]);
      setCells([...data['grid']]);
      if (humanMode && score >= humanBestScore) {
        setHumanBestScore(score + data['score']);
      }
      setScore(score + data['score']);
      setGameOver(data['gameOver']);
    }
  };

  const switchResetAI = async () => {
    if (!humanMode) {
      setResetAI(true);
    }
  };

  const newGame = async () => {
    setCreateGame(true);
    setGameOver(false);
  };

  const startAIGame = async () => {
    if (!humanMode) {
      setStartAI(!startAI);
    }
  };

  useEffect(() => {
    if (resetAI) {
      fetch("/restart").then(
        res => res.json()
      ).then(
        data => {
          setCells(data['board']);
          setResetAI(false);
          setStartAI(false);
          setTotalRewards([]);
          setRewardsData([{}]);
          setScore(0);
        }
      );
    }
    if (createGame && humanMode) {
      fetch("/newgame").then(
        res => res.json()
      ).then(
        data => {
          setCells(data['board']);
          setCreateGame(false);
          setScore(0);
        }
      );
    }
  }, [resetAI, createGame]);

  useEffect(() => {
    let aiInterval;
    if (startAI) {
      aiInterval = setInterval(async () => {
        const response = await fetch("/data");
        const data = await response.json();
        setCells(data['board']);
        setCurrentTrial(data['trial']);
        if (data['score'] >= bestScore) {
          setBestScore(data['score']);
        }
        setScore(data['score']);
        if (data['complete']) {
          setTotalRewards(prevRewards => [...prevRewards, data['reward']]);
        }
        if (data['gameOver']) {
          clearInterval(aiInterval);
          setStartAI(false);
        }
      }, 500); // Adjust the interval time as needed
    } else {
      clearInterval(aiInterval);
    }
    return () => clearInterval(aiInterval);
  }, [startAI, bestScore]);

  useEffect(() => {
    if (totalRewards[totalRewards.length - 1] === 0) {
      totalRewards.pop();
    }
    else {
      let sum = totalRewards[totalRewards.length - 1];
      let episode = currentTrial;
      if (sum && rewardsData[totalRewards.length - 1]['epsiodeCount'] !== episode) {
        setRewardsData([...rewardsData, { episodeCount: episode, reward: sum }]);
      }
    }
  }, [totalRewards]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  });

  const handleToggleHuman = () => {
    if (!startAI) {
      setHumanMode(!humanMode);
      setResetAI(true);
    }
  };

  const handleToggleDDQN = () => {
    const newMode = !ddqnMode;
    setDdqnMode(newMode);
    switchAgent(newMode ? 'ddqn' : 'dqn');
  };
  

  function activateHumanColorStyle(restart = false) {
    let backgroundColor = "";
    if (humanMode) {
      backgroundColor = "#90EE90";
    } else if (!restart) {
      backgroundColor = "#92B7FE";
    }
    return backgroundColor;
  }

  function activateHumanText() {
    let text = "";
    if (humanMode) {
      text = "Human Mode";
    } else {
      text = "DQN AI mode";
    }
    return text;
  }

  function activateAIColorStyle(reset = false) {
    let backgroundColor = "";
    if (!humanMode) {
      if (reset) {
        backgroundColor = "#90EE90";
      } else if (startAI) {
        backgroundColor = "red";
      } else {
        backgroundColor = "green";
      }
    }
    return backgroundColor;
  }

  function activateAIText() {
    let text = "";
    if (startAI) {
      text = "Stop";
    } else {
      text = "Start";
    }
    return text;
  }

  const HumanSettings = () => {
    return (
      <div style={{ marginTop: '-20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <BiggerText>Human Settings</BiggerText>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <SettingsButton style={{ backgroundColor: activateHumanColorStyle(true) }} onClick={newGame}>
            <Text>Restart Game</Text>
          </SettingsButton>
        </div>
      </div>
    );
  };

  const switchAgent = async (agent) => {
    await fetch('/set_agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agent }),
    });
  
    await fetch('/restart');
    const response = await fetch('/data');
    const data = await response.json();
    setCells(data['board']);
    setCurrentTrial(data['trial']);
    setScore(data['score']);
    setGameOver(data['gameOver']);
    setStartAI(false);
    setTotalRewards([]);
    setRewardsData([{}]);
  };
  

  const AISettings = () => {
    return (
      <div style={{ marginTop: '-20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <BiggerText>DQN AI Settings</BiggerText>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <SettingsButton style={{ backgroundColor: activateAIColorStyle(true) }} onClick={switchResetAI}>
            <Text>Reset AI</Text>
          </SettingsButton>
          <SettingsButton style={{ backgroundColor: activateAIColorStyle() }} onClick={startAIGame}>
            <Text>{activateAIText()}</Text>
          </SettingsButton>
        </div>
      </div>
    );
  };

  return (
    <div>
      <ThemeProvider theme={GameDisplay}>
        <MainContainer>
          <Header>
            <ScoreBoard score={score} bestScore={bestScore} humanBest={humanBestScore} />
          </Header>
          <GameArea>
            <GameContainer>
              <Game cells={cells} size={4} />
            </GameContainer>
            <ControlsContainer>
              <ButtonRow>
                <SettingsButton
                  style={{ backgroundColor: humanMode ? '#FFD700' : GameDisplay.secondaryColor }}
                  onClick={() => {
                    setHumanMode(true);
                    setStartAI(false);
                    setResetAI(false);
                  }}
                >
                  <Text>Human Mode</Text>
                </SettingsButton>
                <SettingsButton
                  style={{ backgroundColor: !humanMode ? '#FFD700' : GameDisplay.secondaryColor }}
                  onClick={() => {
                    setHumanMode(false);
                    setStartAI(false);
                    setResetAI(false);
                  }}
                >
                  <Text>DQN AI Mode</Text>
                </SettingsButton>
              </ButtonRow>
  
              {humanMode && (
                <InstructionsContainer>
                  <InstructionText>Use arrowkeys to join blocks!</InstructionText>
                  <ArrowKeysImage src={require('./media/arrowkeys.png')} alt="Arrow keys" />

                </InstructionsContainer>
              )}
              {!humanMode && (
                <InstructionsContainer>
                  <InstructionText>Watch AI learn and play!</InstructionText>
                </InstructionsContainer>
              )}
  
              {!humanMode && (
                <InstructionsContainer>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <InstructionText>Activate DDQN</InstructionText>
                    <ToggleSwitch>
                      <input type="checkbox" checked={ddqnMode} onChange={handleToggleDDQN} />
                      <span className="slider" />
                    </ToggleSwitch>
                  </div>
                  <InstructionText style={{ fontWeight: 'bold' }}>Current Agent: {ddqnMode ? 'DDQN' : 'DQN'}</InstructionText>
                </InstructionsContainer>
              )}
  
              <BottomButtonRow>
                {!humanMode && <SettingsButton
                  style={{ backgroundColor: startAI ? '#FF7F7F' : '#90EE90' }}
                  onClick={startAIGame}
                >
                  <Text>{activateAIText()}</Text>
                </SettingsButton>}
                <SettingsButton
                  style={{ backgroundColor: !humanMode ? activateAIColorStyle(true) : activateHumanColorStyle(true) }}
                  onClick={!humanMode ? switchResetAI : newGame}
                >
                  <Text>{!humanMode ? 'Reset AI' : 'New Game'}</Text>
                </SettingsButton>
              </BottomButtonRow>
            </ControlsContainer>
          </GameArea>
          {!humanMode && <RewardsContainer>
            <BiggerText>Rewards Chart</BiggerText>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
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
                <YAxis dataKey="reward" />
                <Tooltip />
                <Line type="monotone" dataKey="reward" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </RewardsContainer>}
        </MainContainer>
      </ThemeProvider>
    </div>
  )
  
  
}

export default App;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
`;

const MainContainer = styled.div`
  display: flex;
  justify-content: center;
  background-color: ${props => props.theme.color};
  align-items: center;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
`;

const GameArea = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
`;

const GameContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 20px;
`;

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  background-color: #f5f5dc; /* Light beige color */
  padding: 20px;
  border-radius: 10px;
  height: 400px; /* Fixed height matching the grid */
  width: 300px; /* Fixed width */
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 20px;

  & > *:not(:last-child) {
    margin-right: 10px;
  }
`;

const BottomButtonRow = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  & > *:not(:last-child) {
    margin-right: 10px;
  }
`;

const InstructionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const InstructionText = styled.div`
  color: ${props => props.theme.labelColor};
  font-weight: 300; /* Thin and light font */
  font-size: 18px;
  margin-bottom: 10px;
  max-width: 100%;
  word-wrap: break-word;
`;

const ArrowKeysImage = styled.img`
  width: 150px;
  height: auto;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
  margin-left: 10px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${props => props.theme.primaryColor};
    transition: 0.4s;
    border-radius: 34px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: ${props => props.theme.primaryColor};
  }

  input:checked + .slider:before {
    transform: translateX(26px);
  }
`;

const RewardsContainer = styled.div`
  width: 100%;
  margin-top: 20px;
  height: 420px; /* Same height as the grid and controls container */
`;

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
  margin: 10px 0;
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

