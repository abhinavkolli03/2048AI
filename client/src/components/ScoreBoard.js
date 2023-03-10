import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

ScoreBoard.propTypes = {
  score: PropTypes.number,
  bestScore: PropTypes.number,
};

ScoreBoard.defaultProps = {
  score: 0,
  bestScore: 0,
};

function ScoreBoard({ score, bestScore, humanBest }) {
  return (
    <>
    <GameNameLabel>Gamai 2048</GameNameLabel>
    <Wrapper>
      <Scores>
        <Box>
          <Label>Score</Label>
          <Score>{score}</Score>
        </Box>
        <Box>
          <Label>AI Best</Label>
          <Score>{bestScore}</Score>
        </Box>
        <Box>
          <Label>Human Best</Label>
          <Score>{humanBest}</Score>
        </Box>
      </Scores>
    </Wrapper>
    </>
  );
}

const Wrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const GameNameLabel = styled.div`
  font-weight: bold;
  font-size: 3em;
  text-align: center;
  color: ${props => props.theme.labelColor};
`;

const Scores = styled.div`
  display: flex;
  flex: 1;
  justify-content: center;
`;

const Box = styled.div`
  min-width: 75px;
  text-align: center;
  justify-content: center;
  background-color: ${props => props.theme.primaryColor};
  margin-left: 5px;
  padding: 5px;
  border-radius: 5px;
`;

const Label = styled.div`
  color: ${props => props.theme.labelColor};
  font-weight: bold;
  font-size: 15px;
  padding: 5px;
  text-transform: uppercase;
`;

const Score = styled.div`
  color: ${props => props.theme.white};
  font-weight: bold;
  font-size: 30px;
  left: 0;
`;

export default ScoreBoard;