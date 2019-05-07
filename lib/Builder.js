'use strict';

const Operators = {
  'OR': Symbol('OR'),
  'AND': Symbol('AND'),
  'EQ': Symbol('EQ'),
  'GT': Symbol('GT'),
  'LT': Symbol('LT'),
  'GTE': Symbol('GTE'),
  'LTE': Symbol('LTE'),
  'CONTAINS': Symbol('CONTAINS'),
  'NOT': Symbol('NOT'),
  'BETWEEN': Symbol('BETWEEN'),
  'IN': Symbol('IN'),
  'BEGINS_WITH': Symbol('BEGINS_WITH'),
  'EXISTS': Symbol('EXISTS'),
  'NE': Symbol('NE')
};
const functions = ['or', 'and', 'eq', 'gt', 'lt', 'gte', 'lte', 'not', 'between', 'in', 'begins_with', 'exists', 'ne'];

functions.forEach((func) => {
  exports[func] = function (...children) {
    return {
      'operator': Operators[func.toUpperCase()],
      children
    };
  };
});

exports.Operators = Operators;

exports.contains = function contains (attribute, values, compareOp = Operators.OR) {
  const compareFunction = {
    [Operators.OR]: exports.or,
    [Operators.AND]: exports.and
  }[compareOp];
  if (Array.isArray(values)) {
    return compareFunction(...values.map((value) => contains(attribute, value)));
  }

  return {
    'operator': Operators.CONTAINS,
    'children': [attribute, values]
  };
};
