'use strict';
const {Operators} = require('./Builder');

function Filterable (Model) {
  this.Model = Model;
  this.cnt = 0;
  this.expressionAttributeNames = {};
  this.expressionAttributeValues = {};
  this.filterExpression = '';
}

Filterable.prototype.filterExp = function (operatorNode) {
  this.operators = operatorNode;

  return this;
};

Filterable.prototype._evaluate = async function (operatorNode) {
  switch (operatorNode.operator) {
  case Operators.OR: {
    return (await Promise.all(operatorNode.children
      .map((child) => this._evaluate(child))))
      .map((str) => `(${str})`)
      .join(' or ');
  }

  case Operators.AND: {
    return (await Promise.all(operatorNode.children
      .map((child) => this._evaluate(child))))
      .join(' and ');
  }

  case Operators.NOT: {
    return ` not ${await this._evaluate(operatorNode.children[0])}`;
  }

  case Operators.EXISTS: {
    const [attribute] = operatorNode.children;
    const attributeName = this._newExpressionAttributeName(attribute);
    return `attribute_exists(${attributeName})`;
  }

  case Operators.NULL: {
    const [attribute] = operatorNode.children;
    const attributeName = this._newExpressionAttributeName(attribute);
    const attributeValueName = await this._newExpressionAttributeValue({
      'attributeValueName': ':null',
      'value': null,
      attribute
    });
    return `${attributeName} = ${attributeValueName}`;
  }

  case Operators.BEGINS_WITH: {
    const [attribute, value] = operatorNode.children;
    const attributeName = this._newExpressionAttributeName(attribute);
    const attributeValueName = await this._newExpressionAttributeValue({
      attribute,
      value
    });
    return `begins_with(${attributeName}, ${attributeValueName})`;
  }
  case Operators.CONTAINS: {
    const [attribute, value] = operatorNode.children;
    const attributeName = this._newExpressionAttributeName(attribute);
    const attributeValueName = await this._newExpressionAttributeValue({
      attribute,
      value
    });
    return `contains(${attributeName}, ${attributeValueName})`;
  }

  case Operators.BETWEEN: {
    const [attribute, value1, value2] = operatorNode.children;
    const attributeName = this._newExpressionAttributeName(attribute);
    const attributeValueName1 = await this._newExpressionAttributeValue({
      attribute,
      'value': value1
    });
    const attributeValueName2 = await this._newExpressionAttributeValue({
      attribute,
      'value': value2
    });
    return `${attributeName} between ${attributeValueName1} AND ${attributeValueName2}`;
  }

  default: {
    const [attribute, value] = operatorNode.children;
    const attributeName = this._newExpressionAttributeName(attribute);
    const operatorMap = {
      [Operators.LT]: '<',
      [Operators.GT]: '>',
      [Operators.LTE]: '<=',
      [Operators.GTE]: '>=',
      [Operators.NE]: '<>',
      [Operators.EQ]: '='
    };
    const attributeValueName = await this._newExpressionAttributeValue({
      attribute,
      value
    });
    return `${attributeName} ${operatorMap[operatorNode.operator]} ${attributeValueName}`;
  }
  }
};

Filterable.prototype._newExpressionAttributeName = function (attribute) {
  const attributeName = `#${attribute}`;
  if (!this.expressionAttributeNames[attributeName]) {
    this.expressionAttributeNames[attributeName] = attribute;
  }

  return attributeName;
};

Filterable.prototype._newExpressionAttributeValue = async function ({attribute, attributeValueName, value}) {
  if (!attributeValueName) {
    this.cnt = this.cnt + 1;
    attributeValueName = `:${attribute}${this.cnt}`;
  }

  const {Model} = this;
  const Model$ = Model.$__;
  const {schema} = Model$;

  const attributeObject = schema.attributes[attribute];
  if (!this.expressionAttributeValues[attributeValueName]) {
    if (attributeObject.type && attributeObject.type.name === 'list') {
      this.expressionAttributeValues[attributeValueName] = await attributeObject.attributes[0].toDynamo(value, true, Model, {'updateTimestamps': false});
    } else {
      this.expressionAttributeValues[attributeValueName] = await attributeObject.toDynamo(value, true, Model, {'updateTimestamps': false});
    }
  }

  return attributeValueName;
};

module.exports = Filterable;
