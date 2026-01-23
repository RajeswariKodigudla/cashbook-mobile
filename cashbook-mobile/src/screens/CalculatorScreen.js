import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function CalculatorScreen({ navigation }) {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState(null);
  const [op, setOp] = useState(null);
  const [reset, setReset] = useState(false);

  const inputNumber = (num) => {
    if (reset) {
      setDisplay(num);
      setReset(false);
      return;
    }
    setDisplay(display === '0' ? num : display + num);
  };

  const inputDot = () => {
    if (reset) {
      setDisplay('0.');
      setReset(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clearAll = () => {
    setDisplay('0');
    setPrev(null);
    setOp(null);
    setReset(false);
  };

  const backspace = () => {
    if (reset) return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
  };

  const calculate = () => {
    if (prev === null || op === null) return;

    const current = Number(display);
    let result = 0;

    if (op === '+') result = prev + current;
    if (op === '-') result = prev - current;
    if (op === '*') result = prev * current;
    if (op === '/') result = current === 0 ? 0 : prev / current;

    setDisplay(String(result));
    setPrev(null);
    setOp(null);
    setReset(true);
  };

  const operator = (operator) => {
    if (op && !reset) {
      calculate();
    } else {
      setPrev(Number(display));
    }
    setOp(operator);
    setReset(true);
  };

  const percent = () => {
    setDisplay(String(Number(display) / 100));
  };

  const Button = ({ label, onPress, style, textStyle }) => (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <Text style={[styles.buttonText, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* DISPLAY */}
      <View style={styles.display}>
        <Text style={styles.displayText}>{display}</Text>
      </View>

      {/* KEYPAD */}
      <View style={styles.grid}>
        <Button label="AC" onPress={clearAll} style={styles.lightButton} />
        <Button label="%" onPress={percent} style={styles.lightButton} />
        <Button label="÷" onPress={() => operator('/')} style={styles.lightButton} />
        <Button label="⌫" onPress={backspace} style={styles.lightButton} />

        <Button label="7" onPress={() => inputNumber('7')} />
        <Button label="8" onPress={() => inputNumber('8')} />
        <Button label="9" onPress={() => inputNumber('9')} />
        <Button label="×" onPress={() => operator('*')} style={styles.lightButton} />

        <Button label="4" onPress={() => inputNumber('4')} />
        <Button label="5" onPress={() => inputNumber('5')} />
        <Button label="6" onPress={() => inputNumber('6')} />
        <Button label="−" onPress={() => operator('-')} style={styles.lightButton} />

        <Button label="1" onPress={() => inputNumber('1')} />
        <Button label="2" onPress={() => inputNumber('2')} />
        <Button label="3" onPress={() => inputNumber('3')} />
        <Button label="+" onPress={() => operator('+')} style={styles.lightButton} />

        <Button label="0" onPress={() => inputNumber('0')} />
        <Button label="00" onPress={() => inputNumber('00')} />
        <Button label="." onPress={inputDot} />
        <Button
          label="="
          onPress={calculate}
          style={styles.equalButton}
          textStyle={styles.equalButtonText}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  display: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 20,
    paddingBottom: 40,
  },
  displayText: {
    fontSize: 64,
    color: '#fff',
    fontWeight: '300',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  button: {
    width: '22%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: '1.5%',
    borderRadius: 50,
    backgroundColor: '#333',
  },
  lightButton: {
    backgroundColor: '#a6a6a6',
  },
  equalButton: {
    backgroundColor: '#ff9500',
  },
  buttonText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '400',
  },
  equalButtonText: {
    color: '#fff',
  },
});
